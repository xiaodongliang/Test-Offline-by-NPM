/////////////////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Xiaodong Liang 2016 - ADN/Developer Technical Services
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////////////////
var favicon = require('serve-favicon');
var ForgeRoute = require('./routes/ForgeRoute');
var express = require('express');

var app = express();

app.use('/', express.static(__dirname+ '/www') );
app.use(favicon(__dirname + '/www/images/favicon.ico'));
app.use('/ForgeRoute', ForgeRoute);

app.set('port', process.env.PORT || 3001);

var server = app.listen(app.get('port'), function() {
    console.log('Server listening on port ' + server.address().port);
});
