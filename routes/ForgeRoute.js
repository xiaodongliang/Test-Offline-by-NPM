var express =require ('express') ;
var bodyParser =require ('body-parser') ;

var formidable = require('formidable')
var fs =require ('fs') ;
var path =require ('path') ;


var router =express.Router () ;
router.use (bodyParser.json ()) ;


var config = require('./config-view-and-data.js');
var Lmv = require('./view-and-data.js');

var lmv = new Lmv(config);


var uploadprogress = 0.0;;
var translatingprogress = '0%';
var downloadprogress = 'started';
var currentUrn = '';
var svfPath3d = null;

router.post ('/file', function (req, res) {

    uploadprogress = 0.0;
    translatingprogress = '0%';
    downloadprogress = 'started';
    currentUrn = '';
    var filename ='' ;

    var form =new formidable.IncomingForm () ;
    form.uploadDir ='model-upload-to-Forge' ;
    form
        .on ('field', function (field, value) {
            console.log (field, value) ;
        })
        .on ('file', function (field, file) {
            console.log (field, file) ;
            fs.rename (file.path, form.uploadDir + '/' + file.name) ;
            filename =file.name ;
        })
        .on ('end', function () {
            console.log ('-> upload done') ;
            if ( filename == '' )
                res.status (500).end ('No file submitted!') ;
            res.json ({ 'name': filename }) ;
        })
    ;
    form.parse(req);
}) ;


router.get ('/gettoken', function (req, res) {
    lmv.getToken().then(
        function(response){
           // _token = response.access_token;
           console.log(response.access_token);
            res.send (response) ;
        },
        function(error){
            res.send ({'err':'failed!'}) ;
        });
});


router.post ('/createBucketAndUpload', function (req, res) {

    uploadprogress = 0.0;
    translatingprogress = '0%';
    downloadprogress = 'started';
    currentUrn = '';

    var filename = req.body.name ;
    var serverFile =path.normalize (__dirname + '/../' + 'model-upload-to-Forge/' + req.body.name) ;


    //you probably want a more specific error handler...
    function onError(error) {
        console.log(error);
        res.send({'err':error});
    }

    //wrapper is initialized. Token refreshment will happen automatically
    //no need to worry about it
    function onInitialized(response) {

        var createIfNotExists = true;

        var bucketCreationData = {
            bucketKey: config.defaultBucketKey,
            servicesAllowed: [],
            policy: 'persistent' //['temporary', 'transient', 'persistent']
        };

        lmv.getBucket(config.defaultBucketKey,
            createIfNotExists,
            bucketCreationData).then(
            onBucketCreated,
            onError);
    }

    //bucket retrieved or created successfully
    function onBucketCreated(response) {

        console.log('Uploading to A360 started...');

        fs.stat(serverFile, function (err, stats) {
            if (err) {
                console.log('Uploading to A360 failed...' + err);
                res.send('err',err);
            }
            var total = stats.size;
            var chunkSize = config.fileResumableChunk * 1024 * 1024;

            if( total >  chunkSize)
            {
                console.log('   Resumable uploading for large file...');

                lmv.resumableUpload(serverFile,
                    config.defaultBucketKey,
                    filename,uploadProgressCallback).then(onResumableUploadCompleted, onError);
            }
            else
            {
                //single uploading
                console.log('   Single uploading for small file...');
                lmv.resumableUpload(serverFile,
                    config.defaultBucketKey,
                    filename).then(onSingleUploadCompleted, onError);
            }
            //guid for checking uploading status
            res.send({uploadguid:newGuid()});
        });
    }

    //single upload complete
    function onResumableUploadCompleted(response) {

        for(var index in response)
        {
            if(response[index].objects && response[index].objects[0].id)
            {
                var fileId = response[index].objects[0].id;
                urn = lmv.toBase64(fileId);
                console.log('upload to A360 done: ' + urn);

                lmv.register(urn, true).then(onRegister, onError);

                break;
            }
        }
    }

    //single upload complete
    function onSingleUploadCompleted(response) {

        var fileId = response[0].objects[0].id;
        urn = lmv.toBase64(fileId);
        console.log('upload to A360 done: ' + urn);

        lmv.register(urn, true).then(onRegister, onError);
    }

    //registration complete but may have failed
    //need to check result
    function onRegister(response) {

        if (response.Result === "Success") {

            console.log('Translation requested...');

            //set a relative long time (15 minutes)
            lmv.checkTranslationStatus(
                urn, 1000 * 60 * 30, 1000 * 10,
                progressCallback).then(
                onTranslationCompleted,
                onError);

            uploadprogress = 1;
            currentUrn = urn;
            //res.send({'urn':urn});

        }
        else {
            console.log(response.Result);
        }

        //res.send(response.Result);
    }

    function uploadProgressCallback(n,nbChunks){

        //uploadprogress = progress;

        uploadprogress = 1.0 * (uploadprogress + 1)/nbChunks ;

        console.log('upload progress: ' + uploadprogress);
    }

    //optional translation progress callback
    //may be used to display progress to user
    function progressCallback(progress) {
        console.log('translation progress: ' + progress);
        translatingprogress = progress;
    }

    //file ready for viewing
    function onTranslationCompleted(response) {
        console.log('URN: ' + response.urn);
        translatingprogress = 'complete';
    }

    //start the test
    lmv.initialize().then(onInitialized, onError);

}) ;


router.get ('/upload/:uploadguid/progress', function (req, res) {
    var guid =req.params.uploadguid ;
    var percentage  = (uploadprogress * 100 ).toString() + '%';


    res.send({'progress':percentage,urn:currentUrn});

});

router.post ('/translate/:urn/startCheckingProgress', function (req, res) {
    var urn =req.params.urn ;
    currentUrn = urn;
    translatingprogress = '0%';


    function onError(error) {
        console.log(error);
        res.send({'err':error});
    }

    function progressCallback(progress) {
        console.log('translation progress: ' + progress);
        translatingprogress = progress;
    }

    function onInitialized(response) {

        lmv.checkTranslationStatus(
            currentUrn, 1000 * 60 * 30, 1000 * 10,
            progressCallback);
    }
    lmv.initialize().then(onInitialized, onError);

    res.send({'startCheckingProgress':'ok'});

});

router.get ('/translate/:urn/progress', function (req, res) {
    var urn =req.params.urn ;

    if(currentUrn == urn){
        res.send({'progress':translatingprogress,'urn':urn});
    }else {
        res.send({'err':'Not Current Urn!'});
    }

});

router.get ('/download/:urn/progress', function (req, res) {
    var urn =req.params.urn ;

    res.send({'progress':downloadprogress,urn:currentUrn,svfpath:svfPath3d});

});


router.get ('/downloadsvf/:urn', function (req, res) {


    var urn =req.params.urn ;

    function onError(error) {
        done(error);
        res.send({'err':error});
    }

    function onInitialized(response) {

        svfPath3d = null;
        // downloads package to target directory,
        // creates recursively if not exists
        lmv.download(urn, 'www/offline-models/'+newGuid(),downloadProgressCallback).then(
            onDataDownloaded,
            onError
        );

        res.send('');
    }

    function downloadProgressCallback(progress) {
        console.log('download progress: ' + progress);
        downloadprogress = progress;
    }

    function onDataDownloaded(items) {

        downloadprogress = 'completed';
        console.log('Model downloaded successfully');

        var path3d = items.filter(function(item){
            return item.type === '3d';
        });

        console.log('3D Viewable path:');
        console.log(path3d);

        svfPath3d = path3d;

        //var path2d = items.filter(function(item){
        //    return item.type === '2d';
        //});

        //console.log('2D Viewable path:');
        //console.log(path2d);

        //assume it is a 3D model



       // res.send({'svfpath':path3d});
    }

    //start the test
    lmv.initialize().then(onInitialized, onError);

}) ;

function newGuid() {

    var d = new Date().getTime();

    var guid = 'xxxx-xxxx-xxxx-xxxx-xxxx'.replace(
        /[xy]/g,
        function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
        });

    return guid;
}


module.exports =router ;
