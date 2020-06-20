/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

const uuidv4 = require('uuid/v4');
const cfn = require('./lib/cfn');
const Metrics = require('./lib/metrics');
const S3 = require('./lib/s3');
const MediaConvert = require('./lib/mediaconvert');
const MediaPackage = require('./lib/mediapackage');

exports.handler = async (event, context) => {
    console.log(`REQUEST:: ${JSON.stringify(event, null, 2)}`);
    let config = event.ResourceProperties;
    let responseData = {};

    // Each resource returns a promise with a json object to return cloudformation.
    try {
        console.log(`RESOURCE:: ${config.Resource}`);

        if (event.RequestType === 'Create') {
            switch (config.Resource) {
                case 'S3Notification':
                    await S3.putNotification(config);
                    break;

                case 'EndPoint':
                    responseData = await MediaConvert.getEndpoint(config);
                    break;

                case 'MediaConvertTemplates':
                    await MediaConvert.createTemplates(config);
                    break;
                case 'UUID':
                    responseData = { UUID: uuidv4() };
                    break;

                case 'AnonymousMetric':
                    await Metrics.send(config);
                    break;

                case 'MediaPackageVod':
                    responseData = await MediaPackage.create(config);
                    break;

                default:
                    console.log(config.Resource, ': not defined as a custom resource, sending success response');
            }
        }
        if (event.RequestType === 'Update') {
            switch (config.Resource) {
                case 'S3Notification':
                    await S3.putNotification(config);
                    break;

                case 'EndPoint':
                    responseData = await MediaConvert.getEndpoint(config);
                    break;

                case 'MediaConvertTemplates':
                    await MediaConvert.updateTemplates(config);
                    break;
                case 'MediaPackageVod':
                    responseData = await MediaPackage.update(config);
                    break;
                case 'MediaConvertPresets':
                    //if (config.Recreate) {
                    console.log("recreating templates")
                    await MediaConvert.updatePresetsAndTemplates(config);
                    //}
                    break;
                default:
                    console.log(config.Resource, ': update not supported, sending success response');
            }
        }
        if (event.RequestType === 'Delete') {
            switch (config.Resource) {
                // Feature/so-vod-173 limit on the number of custom presets per region,
                // deleting on a stack delete
                case 'MediaConvertTemplates':
                    await MediaConvert.deleteTemplates(config);
                    break;

                case 'MediaPackageVod':
                    responseData = await MediaPackage.purge(config);
                    break;

                default:
                    console.log(config.Resource, ': delete not required, sending success response');
            }
        }

        const response = await cfn.send(event, context, 'SUCCESS', responseData);
        console.log(`RESPONSE:: ${JSON.stringify(responseData, null, 2)}`);
        console.log(`CFN STATUS:: ${response}`);
    } catch (err) {
        console.error(JSON.stringify(err, null, 2));
        await cfn.send(event, context, 'FAILED');
    }
};
