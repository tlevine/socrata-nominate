var socrata = (function(){
  var webpage = require('webpage')
  var system = require('system')
  var socrata = {}

  var email = system.env.SOCRATA_EMAIL
  var password = system.env.SOCRATA_PASSWORD

  if (typeof('email') === 'undefined' || typeof('password') === 'undefined'){
    console.log('Warning: SOCRATA_EMAIL or SOCRATA_PASSWORD might not be set.')
  }

  socrata.wait = function(sec, func) { setTimeout(func, sec * 1000) }

  socrata.is_domain = function(potential_url){
    return (null !== potential_url.match(/\./)) && (null == potential_url.match(/ /))
  }

  socrata.sites = function(callback) {
    var page = webpage.create()
    page.open('http://status.socrata.com/sites', function(status) {
      var portals = JSON.parse(page.plainText).map(function(portal){
        if (socrata.is_domain(portal.description)) {
          var domain = portal.description
        } else if (socrata.is_domain(portal.name)) {
          var domain = portal.name
        } else {
          var domain = ''
        }
        return domain.replace('https://', '').replace('http://', '').replace(/\/$/, '')
      }).filter(function(domain) { return domain !== '' })
      callback(portals)
    })
  }

  socrata.login = function(domain, callback) {
    var page = webpage.create()
    page.open('https://' + domain + '/login', function (status) {
      var x = page.evaluate(function(email, password){
        document.querySelector('#user_session_login').value = email
        document.querySelector('#user_session_password').value = password
        document.querySelector('input[value="Sign In"]').click()
      }, email, password)
      socrata.wait(3, function(){
        page.render('login.png')
        var user_name = page.evaluate(function(){
          return document.querySelector('.currentUser').innerText
        })
        if (user_name === 'Unknown User') {
          console.log('Logging in failed.')
          phantom.exit()
        } else if (callback) {
          callback(page)
        } else {
          phantom.exit()
        }
      })
    })
  }

  socrata.nominate = function(page, title, description, attachment, callback) {
    page.evaluate(function () {
      window.location.href = '/nominate'
    })
    socrata.wait(3, function(){
      page.render('nominate.png')

      /*
      if (attachment) {
        page.uploadFile('
      }
      */

      page.evaluate(function(title, description){
        // jQuery works but querySelector doesn't?
        jQuery('a[href="#Submit dataset"]').click()

        document.querySelector('#nominateTitle').value = title
        document.querySelector('#nominateDescription').value = description
        setTimeout(function(){
        // Do the submission.
        // document.querySelector('a[href="#Submit"]').click()
        }, 1000)
      }, title, description)

      socrata.wait(2, function(){
        page.render('submit.png')
        callback()
      })
    })
  }

  return socrata
})()

var system = require('system')

var nominate = function(domain) {
  return {
    then:function(callback){
      socrata.login(domain, function(page){
        socrata.nominate(page, system.args[1], system.args[2], system.args[3], callback)
      })
    }
  }
}


socrata.sites(function(sites){
  var promises = [null].concat(sites.map(nominate)).concat({then:phantom.exit})
  promises.reduce(function(_,promise){
    console.log(promise.then)
  })
})
