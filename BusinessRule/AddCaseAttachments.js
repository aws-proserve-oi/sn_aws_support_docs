gs.include('SupportApi');
(function executeRule(current, previous) {
    (function() {
        if (current.created_by == "admin") { return;}
        if (current.table_name == 'incident') {
            var aws_incident = new GlideRecord('x_195647_aws__x_195647_aws_incidents');
            aws_incident.addQuery('incident','=', current.table_sys_id);
            aws_incident.query();
            if (aws_incident.next()) {
                var aws_account = aws_incident.aws_account.getRefRecord();
                var creds = {
                    accessKeyId: String(aws_account.aws_api_key),
                    secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
                };
                var sa = new GlideSysAttachment();
                var data = sa.getContentBase64(current);

                var params = {
                    attachments: [
                        {
                            fileName: String(current.file_name), 
                            data: data
                        }
                    ]
                };
                
                AWSApi = new SupportApi(creds);
                var attachmentResponse = AWSApi.addAttachmentsToSet(params);

                params = {
                    caseId: String(aws_incident.case_id),
                    communicationBody: 'New attachment added from Service Now.',
                    attachmentSetId: attachmentResponse.attachmentSetId
                };
                var result = AWSApi.addCaseCommunications(params);
            }
        }
    })();
})(current, previous);