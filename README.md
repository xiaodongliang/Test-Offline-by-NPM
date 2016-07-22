# Test Offline Model by NPM Package

## Description

This demo consumes the [NPM package] (https://github.com/Developer-Autodesk/view-and-data-npm) for [Forge Viewer](https://developer.autodesk.com/api/view-and-data-api/). It supports large file uploading.

## Setup

* $ npm install
* Request your own API keys from our developer portal [developer.autodesk.com](http://developer.autodesk.com).
* Rename `_config-view-and-data.js` to `config-view-and-data.js` and replace the credentials placeholders with your own keys or use ENV variables:

  clientId: process.env.LMV_CONSUMERKEY || 'your key',
  
  clientSecret: process.env.LMV_CONSUMERSECRET || 'your secret'

* Set up the default bucket name defined by the `defaultBucketKey` variable.
* Configure the port in `server.js` per your requirement.

## Test

* $ node server.js 
* Open a browser to visit `localhost:3001/upload.html`
* Click `choose file` to select a model. Click [Translate this one for me]
* Wait the process of translation completes. If it succeeds, a new item (urn) will be added to the list under `URN List`
* Click one item in the list, a new page will pop out to load the model from your Forge repository as usual. i.e. on-line model
* Click `Download Off-Line Model`
* Wait the process of downloading completes. If it succeeds, a new item (svf path) will be added to the list under `Off-Line svf List`. The corresponding package will be available at your server.
* Click one item in the list, a new page will pop out to load the model from your server, using the offline libraries.
* If you have an existing urn, input it in the text box under `My Urns` and click `Add to the list`. Then you can also view the model on-line or download its svf package to view offline model as mentioned above.
 
## To Do
* add progress bar

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.
The Autodesk Viewer is not under MIT License but copyright by Autodesk, Inc.


## Written by

- [Xiaodong Liang](http://adndevblog.typepad.com/cloud_and_mobile/xiaodong-liang.html)

Autodesk Forge, 2016



