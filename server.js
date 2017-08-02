var express = require('express');
var fs      = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();
var _ = require('lodash');
var async = require('async');
var url = require('url');

var makeUrls = function(book, chapter, version) {
  return `https://www.biblegateway.com/passage/?search=${book}+${chapter}&version=${version}`;    
};
var books = [
  // {
  //   name: 'John',
  //   length: 21
  // }
  {
    name: 'Mark',
    length: 16
  }
  // {
  //   name: 'Matthew',
  //   length: 28
  // }
];

var _currentBook = null;

var versions = ['ESV','NVI'];
var output = [];
var toWrite = [];
var chapters = _.map(books, function(b, ib) {
  _currentBook = b;
  var urls = [];
  toWrite.push(`## The Book of ${b.name}`);
  console.log('', b.length);
  for(var i = 1; i <= b.length; i++) {
    toWrite.push(`[${i}](#${i})`);
  };
  _.each(_.range(1, b.length + 1), function(verse, versei) {
    var chapter = [];
    _.each(versions, function(v, i){
      chapter.push(makeUrls(b.name, verse, v));
    })
    urls.push(chapter);
  });
  return urls;
});
async.eachSeries(chapters, (chap, cbFinal) => {
  async.eachSeries(chap,
    function(chapter, cbChapter) {
      var wrapper = {};
      var book = '';
      async.eachSeries(chapter, function(version, cbVersion) {
        request(version, function(error, response, html){
          if(!error){
            var $, _book, _chapter, _url;
            $ = cheerio.load(html);
            _url = url.parse(version, true);
            _chapter = _url.query['search'].split(' ')[1];
            
            if(!wrapper[version]) wrapper[version] = [];
            wrapper[version].push(`# ${_currentBook.name}`);
            if(_chapter && _.last(wrapper[version]) !== `# ${_chapter}`) wrapper[version].push(`## <a name="${_chapter}"> ${_chapter}</a>`);
            $('.text').each(function(i,v) {
              var $el, action, actionBlock, actionTrue, isAppend, isVerse, text;

              $el = $(v);
              text = $el.text();
              isVerse = !_.isNaN(parseInt(text.substr(0, _.indexOf(text,' '))));
              isAppend = _.startsWith(text, '―');
              action = isVerse ? 'add' : isAppend ? 'append' : 'nothing';
              actionTrue = function() {
                if(isVerse) wrapper[version].push(text);
              };
              actionBlock = {
                'add': actionTrue,
                'append': function() {
                    wrapper[version][wrapper[version].length - 1] = [wrapper[version][wrapper[version].length - 1], text].join(' ');
                },
                'nothing':_.noop
              }[action]()
            });
            cbVersion();
          } else {
            cbVersion();
          }
        })
      },
      function(err) {
        output.push(wrapper);

        cbChapter(); 
      }
      )
    },
    function(err) {
  //      output = _.omit(output[0], 'chapter');
      _.each(output, function(op, opi) {
         console.log(op);
          var finalVerses = [];
          var allVerseKeys = _.keys(op);
          console.log(allVerseKeys);
          _.chain(op).values().first().each((v,i) => {
            _.each(allVerseKeys, (vk, vki) => {
              finalVerses.push(op[vk][i]);
            });
          }).value();
          toWrite.push(finalVerses.join('  \n'));
          console.log(`verses added: ${finalVerses.length}`)
      });
      cbFinal();
    }
  )
},
(err) => {
      fs.writeFile(`${_currentBook.name}.md`, toWrite.join('  \n'), function(err){
        console.log('File successfully written! - Check your project directory for the output.json file');
      })
});
/*
app.get('/scrape', function(req, res){
  // Let's scrape Anchorman 2

  async.eachSeries(versions, function(version, callbackV) {
  })
  }, function(err, result) {
      // if result is true then every file exists
  });

  var url = 'https://www.biblegateway.com/passage/?search=Mark+1&version=NVI';
  res.send('Check your console!')

})

app.listen('8081')
console.log('Magic happens on port 8081');
*/
exports = module.exports = app;
