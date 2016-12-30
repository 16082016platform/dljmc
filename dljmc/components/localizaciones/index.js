'use strict';

app.localizaciones = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});
app.localization.registerView('localizaciones');

// START_CUSTOM_CODE_localizaciones
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_localizaciones
(function(parent) {
    var dataProvider = app.data.backendServices,
        /// start global model properties

        markerLayers = {},
        getLocation = function(options) {
            var d = new $.Deferred();
            if (options === undefined) {
                options = {
                    enableHighAccuracy: true
                };
            }
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    d.resolve(position);
                },
                function(error) {
                    d.reject(error);
                },
                options);
            return d.promise();
        },

        getDistance = function(data, callback) {
            getLocation()
                .then(function(userPosition) {
                    var position = L.latLng(userPosition.coords.latitude, userPosition.coords.longitude),
                        markerPosition = L.latLng(data.latitude, data.longitude),
                        distance;
                    distance = Math.round(position.distanceTo(markerPosition));
                    if (distance > 1000) {
                        distance /= 1000;
                        distance += " km";
                    } else {
                        distance += " m";
                    }
                    callback(distance);
                });
        },
        /// end global model properties

        fetchFilteredData = function(paramFilter, searchFilter) {
            var model = parent.get('localizacionesModel'),
                dataSource;

            if (model) {
                dataSource = model.get('dataSource');
            } else {
                parent.set('localizacionesModel_delayedFetch', paramFilter || null);
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
                typeName: 'localizaciones',
                dataProvider: dataProvider
            },
            change: function(e) {
                var data = this.data();
                for (var i = 0; i < data.length; i++) {
                    var dataItem = data[i];

                    /// start flattenLocation property
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
                        'unidad': {
                            field: 'unidad',
                            defaultValue: ''
                        },
                        'ubicacion': {
                            field: 'ubicacion',
                            defaultValue: ''
                        },
                    }
                }
            },
            serverFiltering: true,
        },
        /// start data sources
        /// end data sources
        localizacionesModel = kendo.observable({
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
                var dataItem = e.dataItem || localizacionesModel.originalItem;

                app.mobileApp.navigate('#components/localizaciones/details.html?uid=' + dataItem.uid);

            },
            detailsShow: function(e) {
                var uid = e.view.params.uid,
                    dataSource = localizacionesModel.get('dataSource'),
                    itemModel = dataSource.getByUid(uid);

                localizacionesModel.setCurrentItemByUid(uid);

                /// start detail form show

                getDistance(itemModel.ubicacion, function(value) {
                    localizacionesModel.set('getDistance', value);
                });

                /// end detail form show

            },
            setCurrentItemByUid: function(uid) {
                var item = uid,
                    dataSource = localizacionesModel.get('dataSource'),
                    itemModel = dataSource.getByUid(item);

                if (!itemModel.unidad) {
                    itemModel.unidad = String.fromCharCode(160);
                }

                /// start detail form initialization
                /// end detail form initialization

                localizacionesModel.set('originalItem', itemModel);
                localizacionesModel.set('currentItem',
                    localizacionesModel.fixHierarchicalData(itemModel));

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

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('localizacionesModel', localizacionesModel);
            var param = parent.get('localizacionesModel_delayedFetch');
            if (typeof param !== 'undefined') {
                parent.set('localizacionesModel_delayedFetch', undefined);
                fetchFilteredData(param);
            }
        });
    } else {
        parent.set('localizacionesModel', localizacionesModel);
    }

    parent.set('onShow', function(e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = false,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper'),
            dataSourceOptions = localizacionesModel.get('_dataSourceOptions'),
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
        localizacionesModel.set('dataSource', dataSource);
        fetchFilteredData(param);
    });

})(app.localizaciones);

// START_CUSTOM_CODE_localizacionesModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_localizacionesModel