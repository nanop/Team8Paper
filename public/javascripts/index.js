var offCanvasNavVisible = false;
var dashPaperTemplate = "<div id='paper_template' style='display:inline-block;text-align:center;padding:15px;' class='thumbnail'>"+
                               "<div id='paper_image'></div>"+
                               "<div class='caption'>"+
                                 "<p id='paper_label'></p>"+
                                 "<p style='font-size:11px;' id='paper_date'></p>"+
                                 "<p><a href='#' style='width:100%' id='paper_open_btn' class='btn btn-primary' role='button'>Open</a></p>"+
                               "</div>"+
                             "</div>";
var arrMenu = [
  {
    title: 'Paper',
    id: 'menuID',
    icon: 'fa fa-columns',
    items: [
      {
        name: 'Create New Paper',
        icon: 'fa fa-plus',
        link: '/paper'
      },
      {
        name: 'Recent Papers',
        id: 'itemID',
        icon: 'fa fa-files-o',
        link: '',
        items: [
          {
            title: 'Recent Papers',
            icon: 'fa fa-files-o',
            items: []
          }
        ]
      },
      {
        name: 'Logout',
        icon: 'fa fa-sign-out',
        link: '#'
      },
      {
        name: 'Credit',
        icon: 'fa fa-lightbulb-o',
        link: '#'
      }
    ]
  }
];


$(document).ready(function(){

    //off canvas navigation init-----------------------------------
    $('#off_canvas_nav').multilevelpushmenu({
        menu: arrMenu,
        containersToPush: [$('.pushobj')],
        menuWidth: '25%',
        menuHeight: '100%',
        collapsed:true,
        fullCollapse:true,
        preventItemClick:false
    });

    $( '#off_canvas_toggle' ).click(function(){
        if(offCanvasNavVisible){
            $( '#off_canvas_nav' ).multilevelpushmenu( 'collapse' );
            offCanvasNavVisible = false;
        }else{
            $( '#off_canvas_nav' ).multilevelpushmenu( 'expand' );
            offCanvasNavVisible = true;
        }
    });


    //populate recent papers off canvas nav element and dashboard-----------------------------------
    var itemsArray = [];
    var $addToMenu = $( '#off_canvas_nav' ).multilevelpushmenu( 'findmenusbytitle' , 'Recent Papers' ).first();
    $.get("/api1/recentPaperids").done(function(data) {
        var i = 0;
        while (i < data.data.length) {
            if(data.status == "success") {
                if(i<10){
                    itemsArray.push({
                        name: data.data[i].title,
                        icon: 'fa fa-pencil-square-o',
                        link: '/paper/' + data.data[i]._id + ''
                    });
                }
                $('#paper_templates').append(dashPaperTemplate);
                $('#paper_template').attr('id','thumbnail_'+data.data[i]._id);
                $('#paper_image').append(
                    '<i id='+
                    data.data[i]._id+
                    ' class="fa fa-file-o fa-5x context-menu-one box menu-injected"></i>'
                );
                $('#paper_label').append(data.data[i].title);
                var date = new Date(data.data[i].created);
                $('#paper_date').append(date.toLocaleDateString());
                $('#paper_open_btn').attr('href','/paper/'+data.data[i]._id);

                //Set the id of the current paper template to something else to avoid conflicts in the code above
                $('#paper_open_btn').attr('id','open_btn_'+data.data[i]._id);
                $('#paper_image').attr('id','image_'+data.data[i]._id);
                $('#paper_label').attr('id','label_'+data.data[i]._id);
                $('#paper_date').attr('id','date_'+data.data[i]._id);
            }
            i++;
        }
        if(data.status == "success"){
            $('#off_canvas_nav').multilevelpushmenu( 'additems' , itemsArray , $addToMenu , 0 );
        }
    });


    //Context menu binds-----------------------------------
    $.contextMenu({
        selector: '.context-menu-one',
        callback: function(key, options) {
            var m = "clicked: " + key;
        },
        items: {
            "edit": {name: "Edit", icon: "edit"},
            "cut": {name: "Cut", icon: "cut"},
            "copy": {name: "Copy", icon: "copy"},
            "paste": {name: "Paste", icon: "paste"},
            "delete": {name: "Delete", icon: "delete"},
            "sep1": "---------",
            "quit": {name: "Quit", icon: "quit"}
        }
    });

    //Button click binds-----------------------------------
    $('#btn_start').click(function(){
        $( '#off_canvas_nav' ).multilevelpushmenu( 'expand' );
        offCanvasNavVisible = true;
    });

    $(window).resize(function () {
        $( '#off_canvas_nav' ).multilevelpushmenu( 'redraw' );
    });



    //Tooltip binds-----------------------------------
    $('#off_canvas_toggle').tooltip({
        placement:'right',
        title:'Paper quick options',
        html:true
    });

    $('#nav_home').tooltip({
        placement:'right',
        title:'To the top!',
    });

    $('#nav_search').tooltip({
        placement:'right',
        title:'Get dat Paper',
    });

    $('#nav_dashboard').tooltip({
        placement:'right',
        title:'Dashboard',
    });

});

