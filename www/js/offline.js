$(document).ready (function () {

    var urlinfo=window.location.href;
    var len=urlinfo.length;
    var offset=urlinfo.indexOf("?");
    var paramsidinfo=urlinfo.substr(offset,len)
    var paramArray=paramsidinfo.split("=");

    var svfpath= decodeURI(paramArray[1]) ;
    svfpath = svfpath.replace(/\\/g,"/");;
    console.log("svf: "+svfpath);

    function loadOfflineModel(localpath)
    {
        var viewer = new Autodesk.Viewing.Private.GuiViewer3D(
            document.getElementById('viewerContainer'));

        var options = {
            path: localpath,
            env: 'Local'
        };

        Autodesk.Viewing.Initializer (options, function () {

            viewer.initialize();

            viewer.load(options.path);
        });
    }

     loadOfflineModel(svfpath);

}) ;

