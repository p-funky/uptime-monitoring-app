const app = {};

app.config = {
    sessionToken: false
};

app.client = {};

app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
    headers = typeof headers === 'object' && headers !== null ? headers : {};
    path = typeof path === 'string' ? path : '/';
    method = typeof method === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method.toUpperCase()) > -1 ?
        method.toUpperCase() : 'GET';
    queryStringObject = typeof queryStringObject === 'object' && queryStringObject !== null ? queryStringObject : {};
    payload = typeof payload === 'object' && payload !== null ? payload : {};
    callback = typeof callback === 'function' ? callback : false;

    const requestUrl = path + '?';
    let counter = 0;
    for (let queryKey in queryStringObject) {
        if (queryStringObject.hasOwnProperty(queryKey)) {
            counter++;
            if (counter > 1) {
                requestUrl += '&';
            }
            requestUrl += queryKey + '=' + queryStringObject[queryKey];
        }
    }

    const xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    for (let headerKey in headers) {
        if (headers.hasOwnProperty(headerKey)) {
            xhr.setRequestHeader(headerkey, headers[headerKey]);
        }
    }

    if (app.config.sessionToken) {
        xhr.setRequestHeader('token', app.config.sessionToken.id);
    }

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            const statusCode = xhr.status;
            const responseReturned = xhr.responseText;

            if (callback) {
                try {
                    const parsedResponse = JSON.parse(responseReturned);
                    callback(statusCode, parsedResponse);
                } catch (error) {
                    callback(statusCode, false);
                }
            }
        }

    }

    const payloadString = JSON.stringify(payload);
    xhr.send(payloadString);
};

// Bind the forms
app.bindForms = function(){
    document.querySelector("form").addEventListener("submit", function(e){
  
      // Stop it from submitting
      e.preventDefault();
      const formId = this.id;
      const path = this.action;
      const method = this.method.toUpperCase();
  
      // Hide the error message (if it's currently shown due to a previous error)
      document.querySelector("#"+formId+" .formError").style.display = 'hidden';
  
      // Turn the inputs into a payload
      const payload = {};
      const elements = this.elements;
      for(let i = 0; i < elements.length; i++){
        if(elements[i].type !== 'submit'){
          const valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
          payload[elements[i].name] = valueOfElement;
        }
      }
  
      // Call the API
      app.client.request(undefined,path,method,undefined,payload,function(statusCode,responsePayload){
        // Display an error on the form if needed
        if(statusCode !== 200){
  
          // Try to get the error from the api, or set a default error message
          const error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';
  
          // Set the formError field with the error text
          document.querySelector("#"+formId+" .formError").innerHTML = error;
  
          // Show (unhide) the form error field on the form
          document.querySelector("#"+formId+" .formError").style.display = 'block';
  
        } else {
          // If successful, send to form response processor
          app.formResponseProcessor(formId,payload,responsePayload);
        }
  
      });
    });
  };
  
  // Form response processor
  app.formResponseProcessor = function(formId,requestPayload,responsePayload){
    let functionToCall = false;
    if(formId === 'accountCreate'){
      // @TODO Do something here now that the account has been created successfully
      alert('The account create form was successfully submitted');
    }
  };
  
  // Init (bootstrapping)
  app.init = function(){
    // Bind all form submissions
    app.bindForms();
  };
  
  // Call the init processes after the window loads
  window.onload = function(){
    app.init();
  };