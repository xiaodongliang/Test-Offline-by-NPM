
var currenturn = '';

var viewer= null;
var viewerFactory = null;

//var urn1 = 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YWRudGVzdGJ1Y2tldC9SZXZpdE5hdGl2ZS5ydnQ=';
//var urn2 = 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YWRudGVzdGJ1Y2tldC9Gcm9udExvYWRlci5ud2Q=';

var urn1 = '';
var urn2 = '';


function onError(error) {
    console.log('Error: ' + error);
};


function loadmodel(viewerFactory,thisurn){
    viewerFactory.getViewablePath (thisurn,
        function(pathInfoCollection) {

            var viewerConfig = {
                viewerType: 'GuiViewer3D'
            };

            if(viewer == null) {
                viewer = viewerFactory.createViewer(
                    $('#viewerDiv')[0],
                    viewerConfig);


                viewer.load(pathInfoCollection.path3d[0].path);


                viewer.addEventListener(
                    Autodesk.Viewing.GEOMETRY_LOADED_EVENT, _onGeometryLoaded);
            }
            else {
                var mat = new THREE.Matrix4();
                mat.makeScale(0.1,0.1,0.1);
                var loadOptions = {
                    placementTransform:  mat
                }

                viewer.loadModel(pathInfoCollection.path3d[0].path,loadOptions);
            }
        },
        onError);
}
function _onGeometryLoaded(event)
{
    viewer.removeEventListener(
        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
        _onGeometryLoaded);

    loadmodel(viewerFactory,urn2);
}


$(document).ready (function () {

    $('#btnAggregateOnline').click (function (evt) {

        urn1 = $('#urn1').val();
        urn2 = $('#urn2').val();

        var tokenurl = 'http://' + window.location.host + '/ForgeRoute/gettoken';
        var config = {
            environment : 'AutodeskProduction'
         };

        // Instantiate viewer factory
        viewerFactory = new Autodesk.ADN.Toolkit.Viewer.AdnViewerFactory(
            tokenurl,
            config);
        loadmodel(viewerFactory,urn1);


    }) ;

}) ;
