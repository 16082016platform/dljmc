'use strict';

app.viajes = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});
app.localization.registerView('viajes');

// START_CUSTOM_CODE_viajes
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_viajes
(function(parent) {
    var dataProvider = app.data.backendServices,
        /// start global model properties

        processImage = function(img) {

            function isAbsolute(img) {
                if  (img && (img.slice(0,  5)  ===  'http:' || img.slice(0,  6)  ===  'https:' || img.slice(0,  2)  ===  '//'  ||  img.slice(0,  5)  ===  'data:')) {
                    return true;
                }
                return false;
            }

            if (!img) {
                var empty1x1png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=';
                img = 'data:image/png;base64,' + empty1x1png;
            } else if (!isAbsolute(img)) {
                var setup = dataProvider.setup || {};
                img = setup.scheme + ':' + setup.url + setup.appId + '/Files/' + img + '/Download';
            }

            return img;
        },

        _scanBarcode = function(callback) {
            if (window.navigator.simulator === true) {
                callback(new Error('Not supported in simulator'));
            } else {
                cordova.plugins.barcodeScanner.scan(
                    function(result) {
                        callback(null, result.text);
                    },
                    function(error) {
                        callback(new Error(error));
                    }, {
                        "preferFrontCamera": false, // iOS and Android
                        "showFlipCameraButton": true, // iOS and Android
                        "prompt": "Place a barcode inside the scan area", // supported on Android only
                    }
                );
            }

        },
        /// end global model properties

        fetchFilteredData = function(paramFilter, searchFilter) {
            var model = parent.get('viajesModel'),
                dataSource;

            if (model) {
                dataSource = model.get('dataSource');
            } else {
                parent.set('viajesModel_delayedFetch', paramFilter || null);
                return;
            }

            if (paramFilter) {
                model.set('paramFilter', paramFilter);
            } else {
                model.set('paramFilter', undefined);
            }

            if (paramFilter && searchFilter) {
                dataSource.filter({
                    logic: 'and',
                    filters: [paramFilter, searchFilter]
                });
            } else if (paramFilter || searchFilter) {
                dataSource.filter(paramFilter || searchFilter);
            } else {
                dataSource.filter({});
            }
        },

        flattenLocationProperties = function(dataItem) {
            var propName, propValue,
                isLocation = function(value) {
                    return propValue && typeof propValue === 'object' &&
                        propValue.longitude && propValue.latitude;
                };

            for (propName in dataItem) {
                if (dataItem.hasOwnProperty(propName)) {
                    propValue = dataItem[propName];
                    if (isLocation(propValue)) {
                        dataItem[propName] =
                            kendo.format('Latitude: {0}, Longitude: {1}',
                                propValue.latitude, propValue.longitude);
                    }
                }
            }
        },
        dataSourceOptions = {
            type: 'everlive',
            transport: {
                typeName: 'viajes',
                dataProvider: dataProvider
            },
            change: function(e) {
                var data = this.data();
                for (var i = 0; i < data.length; i++) {
                    var dataItem = data[i];

                    /// start flattenLocation property
                    flattenLocationProperties(dataItem);
                    /// end flattenLocation property

                }
            },
            error: function(e) {

                if (e.xhr) {
                    var errorText = "";
                    try {
                        errorText = JSON.stringify(e.xhr);
                    } catch (jsonErr) {
                        errorText = e.xhr.responseText || e.xhr.statusText || 'An error has occurred!';
                    }
                    alert(errorText);
                }
            },
            schema: {
                model: {
                    fields: {
                        'numero': {
                            field: 'numero',
                            defaultValue: ''
                        },
                    }
                }
            },
            serverFiltering: true,
        },
        /// start data sources
        /// end data sources
        viajesModel = kendo.observable({
            _dataSourceOptions: dataSourceOptions,
            fixHierarchicalData: function(data) {
                var result = {},
                    layout = {};

                $.extend(true, result, data);

                (function removeNulls(obj) {
                    var i, name,
                        names = Object.getOwnPropertyNames(obj);

                    for (i = 0; i < names.length; i++) {
                        name = names[i];

                        if (obj[name] === null) {
                            delete obj[name];
                        } else if ($.type(obj[name]) === 'object') {
                            removeNulls(obj[name]);
                        }
                    }
                })(result);

                (function fix(source, layout) {
                    var i, j, name, srcObj, ltObj, type,
                        names = Object.getOwnPropertyNames(layout);

                    if ($.type(source) !== 'object') {
                        return;
                    }

                    for (i = 0; i < names.length; i++) {
                        name = names[i];
                        srcObj = source[name];
                        ltObj = layout[name];
                        type = $.type(srcObj);

                        if (type === 'undefined' || type === 'null') {
                            source[name] = ltObj;
                        } else {
                            if (srcObj.length > 0) {
                                for (j = 0; j < srcObj.length; j++) {
                                    fix(srcObj[j], ltObj[0]);
                                }
                            } else {
                                fix(srcObj, ltObj);
                            }
                        }
                    }
                })(result, layout);

                return result;
            },
            itemClick: function(e) {
                var dataItem = e.dataItem || viajesModel.originalItem;

                app.mobileApp.navigate('#components/viajes/details.html?uid=' + dataItem.uid);

            },
            addClick: function() {
                app.mobileApp.navigate('#components/viajes/add.html');
            },
            editClick: function() {
                var uid = this.originalItem.uid;
                app.mobileApp.navigate('#components/viajes/edit.html?uid=' + uid);
            },
            deleteItem: function() {
                var dataSource = viajesModel.get('dataSource');

                dataSource.remove(this.originalItem);

                dataSource.one('sync', function() {
                    app.mobileApp.navigate('#:back');
                });

                dataSource.one('error', function() {
                    dataSource.cancelChanges();
                });

                dataSource.sync();
            },
            deleteClick: function() {
                var that = this;

                navigator.notification.confirm(
                    'Are you sure you want to delete this item?',
                    function(index) {
                        //'OK' is index 1
                        //'Cancel' - index 2
                        if (index === 1) {
                            that.deleteItem();
                        }
                    },
                    '', ['OK', 'Cancel']
                );
            },
            detailsShow: function(e) {
                var uid = e.view.params.uid,
                    dataSource = viajesModel.get('dataSource'),
                    itemModel = dataSource.getByUid(uid);

                viajesModel.setCurrentItemByUid(uid);

                /// start detail form show
                /// end detail form show
            },
            setCurrentItemByUid: function(uid) {
                var item = uid,
                    dataSource = viajesModel.get('dataSource'),
                    itemModel = dataSource.getByUid(item);

                if (!itemModel.numero) {
                    itemModel.numero = String.fromCharCode(160);
                }

                /// start detail form initialization

                itemModel.valeImage = processImage(itemModel.vale);

                itemModel.guiaImage = processImage(itemModel.guia);

                /// end detail form initialization

                viajesModel.set('originalItem', itemModel);
                viajesModel.set('currentItem',
                    viajesModel.fixHierarchicalData(itemModel));

                return itemModel;
            },
            linkBind: function(linkString) {
                var linkChunks = linkString.split('|');
                if (linkChunks[0].length === 0) {
                    return this.get('currentItem.' + linkChunks[1]);
                }
                return linkChunks[0] + this.get('currentItem.' + linkChunks[1]);
            },
            /// start masterDetails view model functions
            /// end masterDetails view model functions
            currentItem: {}
        });

    parent.set('addItemViewModel', kendo.observable({
        /// start add model properties
        /// end add model properties
        /// start add model functions

        onBarcodeScan: function(field) {
            var addFormSetTarget = $(field.target).data().scannerName,
                addFormData = this.get('addFormData');
            _scanBarcode(function(err, result) {
                if (err) {
                    alert(err);
                } else {
                    addFormData.set(addFormSetTarget, result);
                }
            });
        },
        /// end add model functions

        onShow: function(e) {
            this.set('addFormData', {
                viaticos: '',
                kmfin: '',
                kminicio: '',
                numero: '',
                /// start add form data init

                vale: '',

                guia: '',
                /// end add form data init

            });
            /// start add form show

            app.showFileUploadName('add-item-view');
            /// end add form show

        },
        onCancel: function() {
            /// start add model cancel

            app.clearFormDomData('add-item-view');
            /// end add model cancel

        },
        onSaveClick: function(e) {
            var addFormData = this.get('addFormData'),
                filter = viajesModel && viajesModel.get('paramFilter'),
                dataSource = viajesModel.get('dataSource'),
                addModel = {};

            function saveModel(data) {
                /// start add form data save
                addModel.viaticos = addFormData.viaticos;
                addModel.kmfin = addFormData.kmfin;
                addModel.kminicio = addFormData.kminicio;
                addModel.numero = addFormData.numero;

                addModel.vale = addFormData.vale;

                if (data.guiaIndex) {
                    addModel.guia = data.guiaIndex.Id;
                }

                /// end add form data save

                dataSource.add(addModel);
                dataSource.one('change', function(e) {
                    app.mobileApp.navigate('#:back');
                });

                dataSource.sync();
                app.clearFormDomData('add-item-view');
            };

            /// start add form save

            var uploaded = [],
                totalUploadFields = 0;

            var guiaReader = new FileReader(),
                guiaField = $("#guia")[0].files[0];

            guiaReader.onload = function() {
                var file = {
                    "Filename": guiaField.name,
                    "ContentType": guiaField.type,
                    "base64": guiaReader.result.split(',')[1]
                };

                dataProvider.files.create(file,
                    success.bind(this, "guiaIndex"),
                    function(error) {
                        alert(JSON.stringify(error));
                    });
            };

            if (!guiaField) {
                success("guia", {});
            } else {
                guiaReader.readAsDataURL(guiaField);
                totalUploadFields++;
            }
            /// end add form save

            /// start add form save handler
            function success(fileName, data) {
                /// start upload fields
                /// end upload fields

                uploaded[fileName] = data.result;
                if (data.result) {
                    uploaded.length++;
                } else {
                    alert("Error, when uploading!");
                }

                if (uploaded.length == totalUploadFields) {
                    saveModel(uploaded);
                }
            }
            /// end add form save handler
        }
    }));

    parent.set('editItemViewModel', kendo.observable({
        /// start edit model properties
        /// end edit model properties
        /// start edit model functions

        onBarcodeScan: function(field) {
            var editFormSetTarget = $(field.target).data().scannerName,
                editFormData = this.get('editFormData');
            _scanBarcode(function(err, result) {
                if (err) {
                    alert(err);
                } else {
                    editFormData.set(editFormSetTarget, result);
                }
            });
        },
        /// end edit model functions

        editFormData: {},
        onShow: function(e) {
            var that = this,
                itemUid = e.view.params.uid,
                dataSource = viajesModel.get('dataSource'),
                itemData = dataSource.getByUid(itemUid),
                fixedData = viajesModel.fixHierarchicalData(itemData);

            /// start edit form before itemData
            /// end edit form before itemData

            this.set('itemData', itemData);
            this.set('editFormData', {
                viaticos: itemData.viaticos,
                kmfin: itemData.kmfin,
                kminicio: itemData.kminicio,
                numero: itemData.numero,
                /// start edit form data init

                vale: itemData.vale,

                /// end edit form data init

            });

            /// start edit form show

            app.showFileUploadName('edit-item-view');
            /// end edit form show

        },
        linkBind: function(linkString) {
            var linkChunks = linkString.split(':');
            return linkChunks[0] + ':' + this.get('itemData.' + linkChunks[1]);
        },
        onSaveClick: function(e) {
            var that = this,
                editFormData = this.get('editFormData'),
                itemData = this.get('itemData'),
                dataSource = viajesModel.get('dataSource');

            /// edit properties
            itemData.set('viaticos', editFormData.viaticos);
            itemData.set('kmfin', editFormData.kmfin);
            itemData.set('kminicio', editFormData.kminicio);
            itemData.set('numero', editFormData.numero);
            /// start edit form data save

            itemData.set('vale', editFormData.vale);

            /// end edit form data save

            function editModel(data) {
                /// start edit form data prepare

                if (data && data.guiaIndex) {
                    itemData.set('guia', data.guiaIndex.Id);
                }

                /// end edit form data prepare

                dataSource.one('sync', function(e) {
                    /// start edit form data save success
                    /// end edit form data save success

                    app.mobileApp.navigate('#:back');
                });

                dataSource.one('error', function() {
                    dataSource.cancelChanges(itemData);
                });

                dataSource.sync();
                app.clearFormDomData('edit-item-view');
            };
            /// start edit form save

            var totalUploadFields = 0,
                uploaded = [];

            var guiaReader = new FileReader(),
                guiaField = $("#guia")[0].files[0];
            if (guiaField) {
                totalUploadFields++;
                guiaReader.onload = function() {
                    var file = {
                        "Filename": guiaField.name,
                        "ContentType": guiaField.type,
                        "base64": guiaReader.result.split(',')[1]
                    };

                    dataProvider.files.create(file,
                        successEdit.bind(this, "guiaIndex"),
                        function(error) {
                            alert(JSON.stringify(error));
                        });
                };
            }

            if (!guiaField) {
                successEdit("guia", {});
            } else {
                guiaReader.readAsDataURL(guiaField);
            }
            /// end edit form save

            /// start edit form save handler
if (totalUploadFields === 0) {
    editModel();
}

function successEdit(fileName, data) {
    uploaded[fileName] = data.result;
    uploaded.length++;

    if (uploaded.length == totalUploadFields) {
        editModel(uploaded);
    }
}
/// end edit form save handler
        },
        onCancel: function() {
            /// start edit form cancel
            /// end edit form cancel
        }
    }));

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('viajesModel', viajesModel);
            var param = parent.get('viajesModel_delayedFetch');
            if (typeof param !== 'undefined') {
                parent.set('viajesModel_delayedFetch', undefined);
                fetchFilteredData(param);
            }
        });
    } else {
        parent.set('viajesModel', viajesModel);
    }

    parent.set('onShow', function(e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = false,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper'),
            dataSourceOptions = viajesModel.get('_dataSourceOptions'),
            dataSource;

        if (param || isListmenu) {
            backbutton.show();
            backbutton.css('visibility', 'visible');
        } else {
            if (e.view.element.find('header [data-role="navbar"] [data-role="button"]').length) {
                backbutton.hide();
            } else {
                backbutton.css('visibility', 'hidden');
            }
        }

        dataSource = new kendo.data.DataSource(dataSourceOptions);
        viajesModel.set('dataSource', dataSource);
        fetchFilteredData(param);
    });

})(app.viajes);

// START_CUSTOM_CODE_viajesModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_viajesModel