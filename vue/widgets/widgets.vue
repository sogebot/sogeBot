<template>
  <div>asd</div>
</template>

<script>
export default {
  data: () => {
    return {
    }
  },
}

console.log(this.widgetsFromDB)

/*
socket.on('widgets', function (widgets) {
      $('.widgets').empty().append($('<div class="grid-stack"></div>'))
      for (let widget of widgets) {
        if (_.isNil(widget.id)) continue
        $('.grid-stack').append(`
          <div class="grid-stack-item" id="widget-${widget.id}" data-gs-x="${widget.position.x}" data-gs-y="${widget.position.y}" data-gs-width="${widget.size.width}" data-gs-height="${widget.size.height}">
            <div class="grid-stack-item-content"></div>
          </div>
        `)
        $(`#widget-${widget.id} .grid-stack-item-content`).load(`widgets/${widget.id}.html`, () => commons.translate()).prepend(`<h6 class="widget-title" data-lang="widget-title-cmdboard"></h6>`)
      }
      $('.grid-stack').gridstack({ cellHeight: 42, verticalMargin: 10, removable: true, removeTimeout: 100, handleClass: 'card-header' })
      $('.grid-stack').off('removed').on('removed', function(event, items) {
        let widgets = []
        for (let item of items) {
          widgets.push({
            id: item.el[0].id.split('-')[1],
            position: {
              x: item.x,
              y: item.y
            },
            size: {
              height: item.height,
              width: item.width
            }
          })
        }
        socket.emit('updateWidgets', widgets)
      })
      $('.grid-stack').off('change').on('change', function(event, items) {
        let widgets = []
        for (let item of $('.grid-stack-item')) {
          widgets.push({
            id: $(item).attr('id').split('-')[1],
            position: {
              x: $(item).attr('data-gs-x'),
              y: $(item).attr('data-gs-y')
            },
            size: {
              height: $(item).attr('data-gs-height'),
              width: $(item).attr('data-gs-width')
            }
          })
        }
        socket.emit('updateWidgets', widgets)
      })
    })

    // addWidget
    $("#addWidget").on('click', function (ev) {
      if (!addingWidget) {
        $(".widgets").append($('<div class="col">').load('widgets/widget_create.html'))
        $("#addWidget").css('display', 'none')
        addingWidget = true
      }
    })*/
</script>