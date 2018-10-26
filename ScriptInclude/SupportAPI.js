gs.include('SignUtil');
var SupportApi = Class.create();

SupportApi.prototype = {
    
    initialize: function(creds) {
        this.creds    = creds;
        this.endpoint = 'https://support.us-east-1.amazonaws.com/';
    },

    listCases: function(params) {
        /*{
            "caseIdList": [
                ""
            ], 
            "displayId": "", 
            "afterTime": "", 
            "beforeTime": "", 
            "includeResolvedCases": true, 
            "nextToken": "", 
            "language": "", 
            "includeCommunications": true,
            "maxResults":10
        }*/
        var defaults =  {
            includeResolvedCases: false, 
            includeCommunications: false,
            maxResults:10
        };
        params = this._extend(defaults, params);
        if (params["caseIdList"]) delete params["maxResults"];
        var response = this._execute_request(params, 'DescribeCases');
        if (response) {
            return response.cases;
        }
    },

    getCaseCommunications: function(params) {
        /*{
            "caseId": "", 
            "beforeTime": "", 
            "afterTime": "", 
            "nextToken": "", 
            "maxResults": 0
        }*/
        var response = this._execute_request(params, 'DescribeCommunications');
        if (response) {
            return response.communications;
        }
    },

    addCaseCommunications: function(params) {
        /*{
            "caseId": "", 
            "communicationBody": "", 
            "ccEmailAddresses": [
                ""
            ], 
            "attachmentSetId": ""
        }*/
        var response = this._execute_request(params, 'AddCommunicationToCase');
        if (response) {
            return response;
        }
        
    },

    createCase: function (params) {
        /*{
            "subject": "", 
            "serviceCode": "", 
            "severityCode": "", 
            "categoryCode": "", 
            "communicationBody": "", 
            "ccEmailAddresses": [
                ""
            ], 
            "language": "", 
            "issueType": "", 
            "attachmentSetId": ""
        }*/
        /*var defaults =  {
            "serviceCode": 'amazon-relational-database-service-mysql', 
            "categoryCode": "other"
        };
        params = this._extend(defaults, params);*/
        var response = this._execute_request(params, 'CreateCase');
        if (response) {
            return response.caseId;
        }
    },

    resolveCase: function (caseId) {
        /*{
            "caseId": ""
        }*/
        var params = {
            "caseId" : String(caseId)
        };
        var response = this._execute_request(params, 'ResolveCase');
        if (response) {
            return response;
        }
    },

    addAttachmentsToSet: function(params) {
        /*{
            "attachmentSetId": "", 
            "attachments": [
                {
                    "fileName": "", 
                    "data": null
                }
            ]
        }*/
        var response = this._execute_request(params, 'AddAttachmentsToSet');
        if (response) {
            return response;
        }
    },

    describeAttachment: function(params) {
        /*{
           "attachmentId": "string"
        }*/
        var response = this._execute_request(params, 'DescribeAttachment');
        if (response) {
            return response;
        }
    },

    describeServices: function (params) {
        /*{
            "serviceCodeList": [
                ""
            ], 
            "language": ""
        }*/
        if (!params) {params = {};}
        var response = this._execute_request(params, 'DescribeServices');
        if (response) {
            return response.services;
        }
    },

    _execute_request: function(params, action) {
        var opts = {
            service : 'support', // 'AWSSupport_20130415.',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSSupport_20130415.',
                'User-Agent'  : ''
            }
        };
        opts.headers['X-Amz-Target'] += action;
        opts.body = JSON.stringify(params);
        var signature = AWSSignUtil.sign(opts, this.creds);
        var request = new sn_ws.RESTMessageV2();
        request.setHttpMethod(opts.method);
        request.setEndpoint(this.endpoint);
        request.setRequestHeader('Content-Type', opts.headers['Content-Type']);
        request.setRequestHeader('X-Amz-Target', opts.headers['X-Amz-Target']);
        request.setRequestHeader('Authorization', signature.headers.Authorization);
        request.setRequestHeader('X-Amz-Date', signature.headers['X-Amz-Date']);
        request.setRequestHeader('User-Agent', signature.headers['User-Agent']);
        request.setRequestBody(opts.body);
        gs.info("PARAMS: "+JSON.stringify(opts.body));
        var response = request.execute();
        if (response.haveError()) {
            gs.error("AWS request error." +
                " Error Code: " + response.getErrorCode() +
                " Message: " + response.getErrorMessage() +
                " Status Code: "+ response.getStatusCode() +
                " Response Body: "+ response.getBody());
            return null;
        } else {
            return JSON.parse(response.getBody());
        }
    },

    _extend: function extend(obj, src) {
        for (var key in src) {
            if (src.hasOwnProperty(key)) obj[key] = src[key];
        }
        return obj;
    },


    type: 'SupportApi'
};