/* global translations socket _ $ atob btoa */

var commons = {
  stub: function (id, value) {
    return // do nothing
  },
  setResponse: function (key, value) {
    socket.emit('responses.set', {
      key: key,
      value: commons.cleanResponseText(value)
    })
  },
  translate: function (key) {
    if (_.isNil(key)) {
      // translate everything if key is not given
      _.each($('[data-lang]'), function (el) {
        var key = ($(el).data('lang'))
        if ($(el).text().trim().length === 0) {
          $(el).html(_.at(translations, key)[0])
          if (_.isNil(_.at(translations, key)[0])) {
            if (key.startsWith('responses.variable.')) $(el).text('Unknown variable $' + key.replace(
              'responses.variable.', ''))
            else $(el).text('undefined: ' + key)
          }
        }
      })
    } else {
      // return translation of a key
      return _.isNil(_.at(translations, key)[0]) ? `{${key}}` : _.at(translations, key)[0]
    }
  },
  hash: function (value) {
    return btoa(encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16))
    }))
  },
  unhash: function (value) {
    return decodeURIComponent(Array.prototype.map.call(atob(value), function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
  },
  editable: function (options) {
    try {
      options = options || {}
      options.id = !_.isNil(options.id) ? options.id : ''
      options.text = !_.isNil(options.text) ? options.text.toString() : ''
      options.fnc = !_.isNil(options.fnc) ? options.fnc : null
      options.match = !_.isNil(options.match) ? window.btoa(JSON.stringify(options.match)) : null // match regexp
      options.errorContainer = !_.isNil(options.errorContainer) ? window.btoa(options.errorContainer) : null
      options.filters = !_.isNil(options.filters) ? options.filters : []
      options.options = !_.isNil(options.options) ? options.options : []
      options.data = !_.isNil(options.data) ? options.data : {}
      options.placeholder = !_.isNil(options.placeholder) ? options.placeholder : '&nbsp;'
      options.mask = !_.isNil(options.mask) ? options.mask : null

      var id = window.crypto.getRandomValues(new Uint32Array(1))
      var stringAbbr = commons.withFilters(options.text)
      var dataArr = []
      for (let [key, value] of Object.entries(options.data)) {
        if (_.isNil(value) || value === 'null') dataArr.push(`${key}`)
        else dataArr.push(`${key}="${value}"`)
      }

      var output = '<abbr class="form-control" id="' + id + '" data-id="' + options.id +
      '" data-fnc="' + options.fnc + '" data-filters="' + options.filters.join(',') +
      '" data-errorcontainer="' + options.errorContainer + '" data-value="' + commons.hash(options.text) + '" contenteditable="true" placeholder="' + options.placeholder + '" ' + dataArr.join(' ') + ' data-match="' + options.match + '">' + (!_.isNil(options.mask) ? options.text.replace(/./g, options.mask) : stringAbbr) + '</abbr>'
      setTimeout(function () {
        commons.translate()

        $('.remove').off()
        $('.remove').on("DOMNodeRemoved", function () {
          $(this).prev(".tgt").remove()
        })

        $(`#${id}[contenteditable=true]`).off()
        $(`#${id}[contenteditable=true]`)
          .keyup(function () {
            if (_.isNil($(this).data('match')) || _.isNil($(this).data('errorcontainer'))) return
            let matchRegexp = JSON.parse(window.atob($(this).data('match')))
            let errorContainer = window.atob($(this).data('errorcontainer'))

            $(errorContainer).css('display', 'none')
            for (let [regexp, error] of Object.entries(matchRegexp)) {
              regexp = new RegExp(regexp, 'g')
              if (_.isNil(commons.cleanResponseText($(this).html()).trim().match(regexp))) {
                $(errorContainer).text(error)
                $(errorContainer).css('display', 'inline-block')
              }
            }
          })
          // When you click on item, record into data("initialText") content of this item.
          .focus(function () {
            var self = this

            $(this).html(commons.cleanResponseText(commons.unhash($(this).data('value'))))
            if ($(this).html().trim().length === 0) $(this).html('&nbsp;') // don't lose cursor if empty

            $(this).data('initialText', $(this).html())

            var div = $(
              '<div id="helper" contenteditable="false"></div>'
            )
            // show filters
            if (_.includes($(this).data('filters').split(','), 'global')) {
              div.append(`<div style="display: inline-block; padding: 5px;">
                <div class="text-primary" style="font-size:14px; font-weight: bold">Global variables: </div>
                <span class="editable-variable block" data-var="title" data-lang="responses.variable.title"></span>
                <span class="editable-variable block" data-var="game" data-lang="responses.variable.game"></span>
                <span class="editable-variable block" data-var="viewers" data-lang="responses.variable.viewers"></span>
                <span class="editable-variable block" data-var="views" data-lang="responses.variable.views"></span>
                <span class="editable-variable block" data-var="hosts" data-lang="responses.variable.hosts"></span>
                <span class="editable-variable block" data-var="followers" data-lang="responses.variable.followers"></span>
                <span class="editable-variable block" data-var="subscribers" data-lang="responses.variable.subscribers"></span>
                <span class="editable-variable block" data-var="currentSong" data-lang="responses.variable.currentSong"></span>
                </div>`)
              div.css('display', 'block')
            }

            // show custom filters
            var localFilters
            _.each($(this).data('filters').split(','), function (filter) {
              if (filter === 'global' || filter.length === 0) return true
              if (_.isNil(localFilters)) localFilters =
                '<div style="display: inline-block;vertical-align:top; padding: 5px;"><div class="text-primary" style="font-size:14px; font-weight: bold">Local variables: </div>'
              localFilters = localFilters +
                '<span class="editable-variable block" data-var="' +
                filter + '" data-lang="responses.variable.' + filter + '"></span> '
              div.css('display', 'block')
            })
            if (!_.isNil(localFilters)) div.append(localFilters + '</div>')

            $(self).on('keyup keydown', function () {
              if ($(self).html().trim().startsWith('<div id="helper"')) $('#helper').before('&nbsp;')
            })

            $(this).append(div)
            div.children('div').children('span').click(function (ev) {
              $('#helper').before('$' + $(ev.currentTarget).data('var'))
            })
            commons.translate()
          })
          // When you leave an item...
          .blur(function () {
            $('#helper').remove()
            var newString = commons.cleanResponseText($(this).html())
            $(this).data('value', commons.hash(commons.cleanResponseText($(this).html())))
            if (!_.isNil(options.mask)) $(this).html(newString.replace(/./g, options.mask))
            else {
              $(this).html(commons.withFilters(newString))
            }
            // ...if content is different...
            if ($(this).data('initialText').trim() !== newString.trim()) {
              if (!_.isNil($(this).data('fnc'))) {
                var fnc = $(this).data('fnc').split('.')
                window[fnc[0]][fnc[1]]($(this).data('id'), newString, options.options)
              }
            }
            commons.translate()
          })
      }, 100)
      return output
    } catch (e) {
      return e
    }
  },
  withFilters: function (text) {
    var filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(translations.responses.variable), (o) => -o.length).join('|') + ')', 'g')
    return text.replace(filtersRegExp, '<span contenteditable="false" class="editable-variable" data-lang="responses.variable.$1"></span><span class="remove"></span>&nbsp;')
  },
  cleanResponseText: function (text) {
    return $(`<div>
        ${text.replace(/&nbsp;/g, ' ')
              .replace(/<span.+?data-lang="responses\.variable\.(.+?)">.*?<\/span> /g, '!%%!$1')
              .replace(/!%%!/g, '$')
              .trim()}
      </div>`)
        .text()
        .replace(/\\n|\n|\t|\s{2}/g, ' ') // remove all \n and more than 1 empty space
        .trim()
  },
  getDateString: function (d) {
    return ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
      d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  },
  minimize: function (el) {
    var toMinimize = el.dataset.id
    $(el).children().removeClass()
    if ($("#" + toMinimize).css('display') === 'none') {
      $(el).children().addClass('glyphicon glyphicon-resize-small text-muted')
      $("#" + toMinimize).css('display', 'block')
    } else {
      $(el).children().addClass('glyphicon glyphicon-resize-full text-muted')
      $("#" + toMinimize).css('display', 'none')
    }
  },
  configEditable: function (el, suffix) {
    var $inputGroup = $('#input_' + el.dataset.configId + '_group')
    var $input = $('#input_' + el.dataset.configId)
    $(el).css('display', 'none')
    $inputGroup.css('display', 'flex')
    $input.focus()
    $input.val($(el).text().replace(suffix, '').replace('< empty >', ''))

    $input.off()
    $input.on('focusout', function () {
      var value = $input.val()
      var data = {}
      data[el.dataset.configId] = value
      $inputGroup.css('display', 'none')
      $(el).css('display', 'inline-block')

      if (value.length === 0) $(el).text('< empty >')
      else $(el).text(value + suffix)

      if (value.trim() === '< empty >') return // doesn't save if is as default
      console.debug('EMIT [saveConfiguration]', data)
      socket.emit('saveConfiguration', data)
    })
  },
  confirm: function (el) {
    $(el).parent().children(".btn-confirm").css('display', 'inline-block')
    $(el).parent().children(".btn-remove").css('display', 'none')
  },
  unconfirm: function (el) {
    $(el).parent().children(".btn-confirm").css('display', 'none')
    $(el).parent().children(".btn-remove").css('display', 'inline-block')
  }
}