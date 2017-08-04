const express = require('express'),
fs      = require('fs'),
request = require('request'),
cheerio = require('cheerio'),
app     = express(),
_ = require('lodash'),
async = require('async'),
url = require('url');


var _currentBook,
books, chapters, makeUrls, output, toWrite, version;
makeUrls = function _makeUrls(book, chapter, version) {
  return `https://www.biblegateway.com/passage/?search=${book}+${chapter}&version=${version}`;    
};
books = [
  // {
  //   name: 'John',
  //   length: 21
  // }
  // {
  //   name: 'Mark',
  //   length: 16
  // }
  {
    name: 'Ecclesiastes',
    length: 12
  }
  // {
  //   name: 'Matthew',
  //   length: 28
  // }
];

_currentBook = null;

versions = ['ESV','NVI'];
output = [];
toWrite = [];
chapters = _.map(books, function(b, ib) {
  _currentBook = b;
  var urls = [];
  toWrite.push(`## The Book of ${b.name}`);
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
    (chapter, cbChapter) => {
      var wrapper = {};
      var book = '';
      async.eachSeries(chapter, (version, cbVersion) => {
        request(version, (error, response, html) => {
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
      (err) => {
        output.push(wrapper);

        cbChapter(); 
      }
      )
    },
    (err) => {
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

exports = module.exports = app;
