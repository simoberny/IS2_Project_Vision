var apiai = require('apiai');
var express = require('express');
var url = require('url');
const http = require('http');
const host = 'api.worldweatheronline.com';
const wwoApiKey = 'fda2e356d0ba46ecbc7153434171511';

var apps = express();
var app = apiai("1d6aa22653f341be840ff33c0f2dda0c");
var session = require('express-session');

apps.use(session({ secret: 'quellochevuoi', resave: true, saveUninitialized: true}));

apps.set('view engine', 'ejs');
apps.set('port', (process.env.PORT || 8080));
apps.use(express.static('public'));

apps.get('/', function(req, res) {
    if(!req.session.message){
        req.session.message = [];
    }
    res.render('pages/index', {
        messages: req.session.message,
    });    
});

apps.get('/ajax', function(req, res) {
    if(!req.session.message){
        req.session.message = [];
    }

    res.writeHead(200, {'Content-Type': 'text/html'});

    var data = req.query.data;

    req.session.message.push({position: 'me', text: data});

    var request = app.textRequest(data, {
        sessionId: '5'
    });

    request.on('response', function(response) { 
        let city = response.result.parameters['geo-city'];
        let date = response.result.parameters['date'];
        console.log("Città: " + city);
        console.log('Data: ' + date);

        if(!response.result.parameters['geo-city'] || !response.result.parameters['date']){
            req.session.message.push({position: 'comp', text: response.result.fulfillment.speech});
            res.write(response.result.fulfillment.speech);
            res.end();
            //console.log(response);
        }else{
            callWeatherApi(city, date).then((output) => {      
                req.session.message.push({position: 'comp', text: output.output, table: true, geo: city, icon: output.icon});
                
                var htmlWeather = '' + 
                '<div class="card">' +
                    '<div class="card-body">' +
                        '<h4 class="card-title">Meteo' + city + '</h4>' +
                        '<h6 class="card-subtitle mb-2 text-muted">Weather Online</h6>' +
                        '<img src="'+ output.icon +'" alt="..." class="img-thumbnail">' +
                        '<p class="card-text">' + output.output + '</p>' +
                    '</div>'+
                '</div>';

                res.write(htmlWeather);
                res.end();
            }).catch((error) => {
                console.log("Errore: " + error)
            });
        }
    });
    
    request.on('error', function(error) {
        console.log(error);
    });

    request.end();
});

apps.listen(apps.get('port'), function() {
    console.log('App is running, server is listening on port ', apps.get('port'));
});

function callWeatherApi (city, date) {
    return new Promise((resolve, reject) => {
      // Create the path for the HTTP request to get the weather
      let path = '/premium/v1/weather.ashx?format=json&num_of_days=1' +
        '&q=' + encodeURIComponent(city) + '&key=' + wwoApiKey + '&date=' + date + '&lang=it';

      console.log('API Request: ' +  path);

      http.get({host: host, path: path}, (res) => {
        let body = ''; // var to store the response chunks
        res.on('data', (d) => { body += d; }); // store each response chunk
        res.on('end', () => {
          // After all the data has been received parse the JSON for desired data
          let response = JSON.parse(body);
          let forecast = response['data']['weather'][0];
          let location = response['data']['request'][0];
          let conditions = response['data']['current_condition'][0];
          let currentConditions = conditions['weatherDesc'][0]['value'];
          let icon = conditions['weatherIconUrl'][0]['value'];
          let italian = conditions['lang_it'][0]['value'];

          // Create response
          let output = `Il meteo nella ${location['type']} 
          ${location['query']} è ${italian} con le temperature massime previste di
          ${forecast['maxtempC']}°C e minime di
          ${forecast['mintempC']}°C in data
          ${forecast['date']}.`;
          // Resolve the promise with the output text
          resolve({output: output, icon: icon});
        });
        res.on('error', (error) => {
          reject(error);
        });
      });
    });
  }

