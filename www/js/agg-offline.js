//var svf1 ='offline-models/abe7-a695-9866-760f-ea51/Resource/3D_View/_3D_/_3D_.svf';
//var svf2 ='offline-models/194e-7b2b-7419-2a08-ee6b/0/0.svf';

var svf1 ='';
var svf2 ='';

var viewer  = null;


function _onGeometryLoaded(event)
{
    viewer.removeEventListener(
        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
        _onGeometryLoaded);

    var options = {
        path: svf2,
        env: 'Local'
    };

    var mat = new THREE.Matrix4();
    mat.makeScale(0.1,0.1,0.1);

    var loadOptions = {
        placementTransform:  mat
    }
    viewer.loadModel(options.path,loadOptions);

 }



$(document).ready (function () {

    $('#btnAggregateOffline').click (function (evt) {

        svf1 = $('#svf1').val();
        svf2 = $('#svf2').val();


        viewer = new Autodesk.Viewing.Private.GuiViewer3D(
            document.getElementById('viewerContainer'));

        var options = {
            path: svf1,
            env: 'Local'
        };

        Autodesk.Viewing.Initializer (options, function () {

            viewer.initialize();

            var mat = new THREE.Matrix4();
             var loadOptions = {
                placementTransform:  mat
            }
            viewer.loadModel(options.path,loadOptions);

            viewer.addEventListener(
                Autodesk.Viewing.GEOMETRY_LOADED_EVENT, _onGeometryLoaded);


        });

    }) ;


}) ;

