gs.include('AwsSupportApi');
gs.include('AwsSupportUtils');
(function PollAwsCases(aws_account) {
    var params = {
      includeCommunications: true,
      includeResolvedCases: false
    };
    var creds = {
        accessKeyId: String(aws_account.aws_api_key),
        secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
    };
    AWSApi = new AwsSupportApi(creds);
    var aws_cases = AWSApi.listCases(params);

    var utils = new AwsSupportUtils(aws_account);
    for (var c in aws_cases) {
        if (utils.caseIsActive(aws_cases[c]["caseId"])) {
            continue;
        } else {
            var incident = utils.createIncidentRecord(aws_cases[c]);
            //gs.info("Created New Incident: "+incident.number+" from AWS case "+ams_incident.case_id);
        }
    }
})(current);