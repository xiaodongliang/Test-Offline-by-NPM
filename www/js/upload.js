
var currenturn = '';
$(document).ready (function () {

    $('#btnTranslateThisOne').click (function (evt) {
        $('#msg').text ('') ;
        var files =document.getElementById ('files').files ;
        if ( files.length == 0 )
            return ;

        $.each (files, function (key, value) {
            var data =new FormData () ;
            data.append (key, value) ;

            $.ajax ({
                url: 'http://' + window.location.host + '/ForgeRoute/file',
                type: 'post',
                headers: { 'x-file-name': value.name },
                data: data,
                cache: false,
                //dataType: 'json',
                processData: false, // Don't process the files
                contentType: false, // Set content type to false as jQuery will tell the server its a query string request
                complete: null
            }).done (function (data) {
                $('#msg').text (value.name + ' file uploaded on your server') ;
                translate (data) ;
            }).fail (function (xhr, ajaxOptions, thrownError) {
                $('#msg').text (value.name + ' upload failed!') ;
            }) ;
        }) ;

    }) ;

    $('#btnAddThisOne').click (function (evt) {
        var urn =$('#urn').val ().trim () ;
        if ( urn == '' )
            return ;
        AddThisOne (urn) ;
        currenturn = urn;
    }) ;

    $('#btnDownload').click (function (evt) {
        downloadsvf();
    }) ;


}) ;

function AddThisOne (urn) {

    var id =urn.replace (/=+/g, '') ;
    $('#list').append ('<div class="list-group-item row">'
        + '<button id="' + id + '" type="text" class="form-control">' + urn + '</button>'
        + '</div>'
    ) ;

    $('#' + id).click (function (evt) {
        window.open ('/?urn=' + $(this).text (), '_blank') ;
    }) ;
}

function AddThisSVFOne (svf) {

    var svfid =svf.toLowerCase().replace(/[^0-9a-z-]/g,''); ;
    //remove server path
    var encodeStr = encodeURI(svf.replace('www\\',''));

    $('#offlinelist').append ('<div class="list-group-item row">'
        + '<button id="' + svfid + '" type="text" class="form-control">' + svf + '</button>'
        + '</div>'
    ) ;

    $('#' + svfid).click (function (evt) {
        //save code to build path.
        window.open ('/offline.html?svf=' + encodeStr, '_blank') ;
    }) ;
}

function translate (data) {
    $('#msg').text (data.name + ' translation request...') ;
    $.ajax ({
        url: '/ForgeRoute/translate',
        type: 'post',
        data: JSON.stringify (data),
        timeout: 0,
        contentType: 'application/json',
        complete: null
    }).done (function (response) {
        if(response.err) {
            $('#msg').text(data.name + ' translation failed...' + response.err);
        }
        else {
            $('#msg').text(data.name + ' translation requested...');
            setTimeout (function () { translateProgress (response.urn) ; }, 5000) ;

            currenturn = response.urn;
        }
    }).fail (function (xhr, ajaxOptions, thrownError) {
        $('#msg').text (data.name + ' translation request failed!') ;
    }) ;
}

function translateProgress (urn) {
    $.ajax ({
        url: '/ForgeRoute/translate/' + urn + '/progress',
        type: 'get',
        data: null,
        contentType: 'application/json',
        complete: null
    }).done (function (response) {
         if(response.err){
             $('#msg').text (response.err) ;
         }
        else {
             if (response.progress) {
                 $('#msg').text(response.progress);
                 if (response.progress == 'complete') {
                     AddThisOne(response.urn);
                     $('#msg').text('');
                 }
                 else {
                     setTimeout(function () {
                         translateProgress(urn);
                     }, 5000);
                 }
             }
         }
    }).fail (function (xhr, ajaxOptions, thrownError) {
        $('#msg').text ('Progress request failed!') ;
    }) ;
}

function downloadsvf(){
    //AddThisSVFOne ( 'www\\offline-models\\dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6eGlhb2Rvbmd0ZXN0YnVja2V0L2V3cWVzYWRheng3NjguZHdmeA==\\045dd8ef-0960-8f10-7abd-225b2796c5f3\\0.svf') ;
   //currenturn = 'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YWRudGVzdGJ1Y2tldC9DbGFzaFRlc3Qubndk';
    $.ajax ({
        url: '/ForgeRoute/downloadsvf/' + currenturn ,
        type: 'get',
        data: null,
        contentType: 'application/json',
        complete: null
    }).done (function (response) {
        if(response.err) {
            $('#msg').text(currenturn + ' translation failed...' + response.err);
        }
        else {
            $('#msg').text (currenturn + ' download  svf completed!>>' + response.svfpath ) ;

            AddThisSVFOne (response.svfpath[0].path.replace('www\\','')) ;
        }

    }).fail (function (xhr, ajaxOptions, thrownError) {
        $('#msg').text (currenturn + ' download  svf failed!') ;
    }) ;
}