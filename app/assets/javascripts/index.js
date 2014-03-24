var papers;
var searchTagCache = [];
var canvasPaperCache = [];
var offCanvasNavVisible = false;
var alphaNumRegx = /^[A-Za-z0-9_-]+$/;
var dashPaperTemplate = "<div id='paper-template' style='display:inline-block;text-align:center;padding:12px;min-width:200px;' class='btn btn-default'>"+
                           "<div class='row'>"+
                               "<div class='col-md-3'>"+
                                   "<div id='paper-icon'></div>"+
                               "</div>"+
                               "<div class='col-md-9' style='padding:0px'>"+
                                   "<div class='caption' style='padding:0px 0px 15px 0px;'>"+
                                     "<p id='paper-label' style='font-size:21px;'></p>"+
                                     "<span style='font-size:10px;' id='paper-updated'></span><br>"+
                                     "<span style='font-size:10px;' id='paper-created'></span>"+
                                   "</div>"+
                               "</div>"+
                           "</div>"+
                           "<a href='#' style='width:100%' id='paper-open-btn' class='btn btn-primary' role='button'>Open</a>"+
                        "</div>";

var searchResultTemplate = "<div id='search-result-item' style='text-align:left;width:100%;margin:0;' class='row'>"+
                                   "<div class='col-md-1'>"+
                                       "<a id='search-result-icon' style='color:#eef;'><i class='fa fa-file-o fa-3x'></i></a>"+
                                   "</div>"+
                                   "<div class='col-md-11'>"+
                                       "<h3 style='margin:0;'><a id='search-result-title' style='color:#eef;'></a></h3>"+
                                       "<div id='search-result-meta' style='font-size:9px;color:#bbb;'>"+
                                           "<div id='search-result-updated'>"+
                                           "</div>"+
                                           "<div id='search-result-created'>"+
                                           "</div>"+
                                           "<div id='search-result-tags' style='font-size:11px;color:#CCE6A4;'>"+
                                           "</div>"+
                                       "</div>"+
                                   "</div>"+
                               "</div>"+
                               "<hr class='soften'/>";
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
        name: 'Credit',
        icon: 'fa fa-lightbulb-o',
        link: ''
      }
    ]
  }
];


//Initialization
$(document).ready(function(){
    updatePapers();
    initTransitions();
    initBinds();
    initState();
    initCanvasMenu();
    initDashboard();
});

//Init functions

function updatePapers() {
    var response = $.getValues('/api1/recentPaperShorts'); //Non asynchronous request
        if(response.status!="success"){
            console.log("Failed to retrieve papers in non-async request");
        }
    papers = response.data;
}

function initTransitions(){
    $("#cover-contents").animate({opacity:1},"slow");
}

function initState(){ //Hide views based on whether user is signed in
    //Nav bar
    if(getCookie("PLAY_SESSION")){
        navSignedInState();
        throwPageBroadcast("Welcome!");
    }else{
        navSignedOutState();
        throwPageBroadcast("Signed in as a Guest!");
    }

    if(papers.length){
        papersFilledState();
    }else{
        papersEmptyState();
    }
}

function initBinds(){
    $('#sign-up-link').click(function(){
        $('#sign-in').slideUp();
        $('#sign-in-footer').slideUp();
        //Delay transition to sign up form
        $('#sign-up').delay(800).slideDown();
        $('#sign-up-footer').delay(800).slideDown();
    });

    $('#sign-in-link').click(function(){
        $('#sign-up').slideUp();
        $('#sign-up-footer').slideUp();
        //Delay transition to sign in form
        $('#sign-in').delay(800).slideDown();
        $('#sign-in-footer').delay(800).slideDown();
    });


    /*Sign in / up validation and submission */
    $("#sign-in-submit").click(function(){
        var username = $('#sign-in-username').val();
        var password = $('#sign-in-password').val();
        if(!username.length || !password.length){
            throwSignInError('Please enter all of your credentials');
            return;
        }
        if(!alphaNumRegx.test(username) || !alphaNumRegx.test(password)){
            throwSignInError('Please enter alpha-numeric characters');
            return;
        }
        $.ajax({
            type: 'POST',
            url: '/api1/login',
            data: JSON.stringify({username:username,password:password}),
            contentType: 'application/json; charset=utf-8'
        })
          .done(function(result){
            if(result.status == "success"){
                throwSignInSuccess("Successfully signed in!");
                window.setTimeout(function(){
                    $('#sign-in-modal').modal('hide');
                },1600);
                reInit();
                navSignedInState();
            }else{
                throwSignInError('Oops! Check your credentials!');
            }
          });
    });

    $("#sign-up-submit").click(function(){
            var username = $('#sign-up-username').val();
            var password = $('#sign-up-password').val();
            var passwordConf = $('#sign-up-password-confirm').val();
            if(!username.length || !password.length || !passwordConf.length){
                throwSignUpError("Please enter all credentials");
                return;
            }
            if(!alphaNumRegx.test(username) || !alphaNumRegx.test(password) || !alphaNumRegx.test(passwordConf)){
                throwSignUpError("Not a valid username or password!");
                return;
            }
            if(password != passwordConf){
                throwSignUpError("Please check that your passwords match!");
                return;
            }
            if(password.length<=5){
                throwSignUpError("Passwords must be at least 6 characters long!");
                return;
            }
            $.ajax({
                type: 'POST',
                url: '/api1/register',
                data: JSON.stringify({username:username,password:password}),
                contentType: 'application/json; charset=utf-8'
            })
              .done(function(result){
                if(result.status == "success"){
                    $('#sign-in-link').click();
                    throwSignInSuccess("Successfully signed up!");
                }else{
                    throwSignUpError("Aw..Something went wrong. Call Kefu");
                }
              });
        });

    $("#sign-out-nav").click(function(){
        $.ajax({
            type: 'POST',
            url: '/api1/logout',
            data: JSON.stringify({}),
            contentType: 'application/json; charset=utf-8'
        })
          .done(function(result){
            if(result.status == "success"){
                throwPageBroadcast("Successfully signed out!");
                reInit();
                navSignedOutState();
            }
          });
    });

    $('#paper-settings-submit').click(function(){
        var newTitle = $('#paper-settings-title-input').val();
        var id = $('#paper-settings-id').attr('data-id');
        if(id == ''){
            throwPageBroadcast("Please select a paper to edit");
            return;
        }else if(newTitle.length <= 3){
            throwPageBroadcast("Please input at least 4 characters long");
            return;
        }
        var paper = getPaper(id);
        paper.title = newTitle;
        //Tags are automatically updated when added and removed. Nothing to change.
        $.ajax({
            url: '/paper/'+paper._id,
            data: JSON.stringify(paper),
            contentType: 'application/json',
            type: 'post'
        })
          .done(function(result){
            if(result.status == "success"){
                updateDashboardEntry(paper._id);
                throwPageBroadcast("Successfully updated your paper!");
            }else{
                throwPageBroadcast("Sorry! You don't have permission to edit this paper");
            }
          });
    });

    $('#paper-settings-duplicate').click(function(){
         var id = $('#paper-settings-id').attr('data-id');
         var paper = getPaper(id);

         $.ajax({
          type: 'POST',
          url: '/api1/duplicatePaper',
          data: JSON.stringify({_id:paper._id}),
          contentType: 'application/json; charset=utf-8'
         })
           .done(function(result){
            if(result.status == "success"){
                addDashboardEntry(result.data,1);
                throwPageBroadcast("Successfully duplicated your paper");
            }else{
                throwPageBroadcast("Sorry! You don't have permission to duplicate this paper");
            }
        });
    });

    $('#paper-settings-delete').click(function(){
        var id = $('#paper-settings-id').attr('data-id');

        $.ajax({
          type: 'POST',
          url: '/api1/deletePaper',
          data: JSON.stringify({_id:id}),
          contentType: 'application/json; charset=utf-8'
        })
        .done(function(result){
            if(result.status == "success"){
                resetSettingsPanel();
                removeDashboardEntry(id);
                if(papers.length){
                    papersFilledState();
                }else{
                    papersEmptyState();
                }
                throwPageBroadcast("Successfully deleted your paper");
            }else{
                throwPageBroadcast("Sorry! You don't have permission to delete this paper");
            }
        });
    });

    $(window).resize(function () {
        $( '#off-canvas-nav' ).multilevelpushmenu( 'redraw' );
    });

    //Tooltip binds-----------------------------------
    $('#off-canvas-toggle').tooltip({
        placement:'right',
        title:'Paper quick options',
        html:true
    });

    $('#sign-in-nav').tooltip({
        placement:'right',
        title:'Sign in',
        html:true
    });

    $('#sign-out-nav').tooltip({
        placement:'right',
        title:'Sign out',
        html:true
    });

    $('#nav-home').tooltip({
        placement:'right',
        title:'Home'
    });

    $('#nav-search').tooltip({
        placement:'right',
        title:'Search papers'
    });

    $('#nav-dashboard').tooltip({
        placement:'right',
        title:'Dashboard'
    });

    $('#search-tag-input').tagsInput({
        'width':'600px',
        'height': '42px',
        'defaultText': 'Search papers by tags',
        'minChars' : 3,
        'maxChars' : 20,
        'margin' : "auto",
        'class' : "thumbnail",
        'onAddTag':function(value){
            searchTagCache.push(value);
        },
        'onRemoveTag':function(value){
            searchTagCache.splice( $.inArray(value, searchTagCache), 1 );
        }
    });

    $('#search-tag-submit').click(function(){
        $('#search-result-container').slideUp();
        if(searchTagCache.length>0){
            $.ajax({
              type: 'POST',
              url: '/api1/searchTags',
              data: JSON.stringify({tags:searchTagCache}),
              contentType: 'application/json; charset=utf-8'
            })
              .done(function(result){
                    if(result.status=="success"){
                        $('#search-results').empty();
                        if(result.data.length){
                            for(var i=0;i<result.data.length;i++){
                                console.log(result.data[i]);
                                var created = new Date(result.data[i].created).formatDateTime();
                                var updated = new Date(result.data[i].modified).formatDateTime();

                                $('#search-results').append(searchResultTemplate);
                                $('#search-result-icon').attr('href','/paper/'+result.data[i]._id);
                                $('#search-result-title').append(result.data[i].title);
                                $('#search-result-title').attr('href','/paper/'+result.data[i]._id);
                                $('#search-result-updated').append('updated: '+updated);
                                $('#search-result-created').append('created: '+created);
                                $('#search-result-tags').append('tags: '+result.data[i].tags.join(' | '));

                                $('#search-result-item').attr('id','search-result-'+result.data[i]._id);
                                $('#search-result-icon').attr('id','search-result-icon-'+result.data[i]._id);
                                $('#search-result-title').attr('id','search-result-title-'+result.data[i]._id);
                                $('#search-result-created').attr('id','search-result-created-'+result.data[i]._id);
                                $('#search-result-updated').attr('id','search-result-updated-'+result.data[i]._id);
                                $('#search-result-tags').attr('id','search-result-tags-'+result.data[i]._id);
                            }
                            $('#search-result-container').slideDown();
                        }else{
                            throwPageBroadcast("No matching papers found");
                        }
                    }else {
                        throwPageBroadcast("Oops! Your search request has failed");
                    }
              });
        }
    });

    $('#paper-settings-tag-input').tagsInput({
        'width':'100%',
        'height': '200px',
        'minChars' : 3,
        'maxChars' : 20,
        'onAddTag':function(value){
            var paper = getPaper($('#paper-settings-id').attr('data-id'));
            paper.tags.push(value);
        },
        'onRemoveTag':function(value){
            var paper = getPaper($('#paper-settings-id').attr('data-id'));
            paper.tags.splice( $.inArray(value, paper.tags), 1 );
        }
    });

    $('#search-result-container').hide();

    $('#search-slide-up').click(function(){
        $('#search-result-container').slideUp();
    });
}

function initCanvasMenu(){
    $('#off-canvas-nav').multilevelpushmenu({
        menu: arrMenu,
        containersToPush: [$('.pushobj')],
        menuWidth: '25%',
        menuHeight: '100%',
        collapsed:true,
        fullCollapse:true,
        preventItemClick:false
    });

    $( '#off-canvas-toggle' ).click(function(){
        if(offCanvasNavVisible){
            $( '#off-canvas-nav' ).multilevelpushmenu( 'collapse' );
            offCanvasNavVisible = false;
        }else{
            $( '#off-canvas-nav' ).multilevelpushmenu( 'expand' );
            offCanvasNavVisible = true;
        }
    });

    //Push items to off canvas menu
    var itemsArray = [];
    var $addToMenu = $( '#off-canvas-nav' ).multilevelpushmenu( 'findmenusbytitle' , 'Recent Papers' ).first();
    for(var i=0;i<papers.length;i++){
        if(i<10){
            itemsArray.push({
                name: papers[i].title,
                icon: 'fa fa-pencil-square-o',
                link: '/paper/' + papers[i]._id + ''
            });
            canvasPaperCache.push(papers[i].title);
        }
    }
    $('#off-canvas-nav').multilevelpushmenu( 'additems' , itemsArray , $addToMenu , 0 );
}


function initDashboard(){
    for(var i=0;i<papers.length;i++){
        addPaperToDash(papers[i],0);
    }
}

//Reinitialization functions to bypass the need to reload page
function reInit() {
    updatePapers();
    reInitCanvasMenu();
    reInitSearch();
    resetSettingsPanel();
    reInitDashboard();
    if(papers.length){
        papersFilledState();
    }else{
        papersEmptyState();
    }
}

function reInitSearch(){
    $('#search-results').empty();
    $('#search-result-container').slideUp();
}

function reInitCanvasMenu(){
    //Remove items from recent papers menu
    for(var i=0;i<canvasPaperCache.length;i++){
        var item = $( '#off-canvas-nav' ).multilevelpushmenu( 'finditemsbyname' , canvasPaperCache[i] ).first();
        $( '#off-canvas-nav' ).multilevelpushmenu( 'removeitems' , item );
    }
    canvasPaperCache.clear();
    //Push items to off canvas menu
    var itemsArray = [];
    var $addToMenu = $( '#off-canvas-nav' ).multilevelpushmenu( 'findmenusbytitle' , 'Recent Papers' );
    for(var i=0;i<papers.length;i++){
        if(i<10){
            itemsArray.push({
                name: papers[i].title,
                icon: 'fa fa-pencil-square-o',
                link: '/paper/' + papers[i]._id + ''
            });
            canvasPaperCache.push(papers[i].title);
        }
    }
    $('#off-canvas-nav').multilevelpushmenu( 'additems' , itemsArray , $addToMenu , 0 );
}


function reInitDashboard(){
    $('#paper-templates').empty();
    initDashboard();
}

//Helper functions

function resetSettingsPanel(){
    $('#paper-settings-id').attr('data-id','');
    $('#paper-settings-title-input').val('');
    $('#paper-settings-created').html('---------------------');
    $('#paper-settings-updated').html('---------------------');
    $('#paper-settings-tag-input').importTags('');
}

function removeDashboardEntry(id) {
    removePaper(id);
    $("#thumbnail-"+id).animate({opacity: 0}, 500);
    window.setTimeout(function(){$("#thumbnail-"+id).remove();},1000);
    /*Relative positioning of entries mess up fadeOut. This solution is crude
     *but works slightly better with less flicker*/
}

function addDashboardEntry(id,prepend) {
    updatePapers(); //This is inefficient...we should retrieve the paper on duplicate and not just the id..
    addPaperToDash(getPaper(id),prepend);
}

function updateDashboardEntry(id) {
    paper = getPaper(id);
    var data = $("#thumbnail-"+paper._id).children('div[id*="image-"]');
    var created = new Date(paper.created).formatDateTime();
    var updated = new Date(paper.modified).formatDateTime();
    data.html(
        '<i id='+
        paper._id+
        ' data-title="'+
        paper.title+
        '" data-created="'+
        created+
        '" data-updated="'+
        updated+
        '" data-tags="'+
        paper.tags.join(',')+
        '" class="fa fa-file-o fa-5x context-menu-one box menu-injected"></i>'
    );

    if(paper.title.length > 9) {
        $('#label-'+paper._id).html(paper.title.slice(0,9)+'..');
    }else{
        $('#label-'+paper._id).html(paper.title);
    }

    $('#date-'+paper._id).html(created);
    $('#paper-settings-updated').html(updated);
}

function addPaperToDash(paper,prepend){
    var created = new Date(paper.created).formatDateTime();
    var updated = new Date(paper.modified).formatDateTime();
    if(prepend){
        $('#paper-templates').prepend(dashPaperTemplate);
    }else{
        $('#paper-templates').append(dashPaperTemplate);
    }
    $('#paper-template').attr('id','thumbnail-'+paper._id);
    $('#paper-icon').append(
        '<i id='+
        paper._id+
        ' data-title="'+
        paper.title+
        '" data-created="'+
        created+
        '" data-updated="'+
        updated+
        '" data-tags="'+
        paper.tags.join(',')+
        '" class="fa fa-file-o fa-4x context-menu-one box menu-injected"  style="padding:0px;"></i>'
    );


    //Account for long titles to prevent screwing up each paper templates
    if(paper.title.length > 9) {
        $('#paper-label').append(paper.title.slice(0,9)+'..');
    }else{
        $('#paper-label').append(paper.title);
    }

    $('#paper-updated').append('M: '+updated);
    $('#paper-created').append('C: '+created);
    $('#paper-open-btn').attr('href','/paper/'+paper._id);

    //Set the id of the current paper template to something else to avoid conflicts in the code above
    $('#paper-open-btn').attr('id','open-btn-'+paper._id);
    $('#paper-icon').attr('id','image-'+paper._id);
    $('#paper-label').attr('id','label-'+paper._id);
    $('#paper-created').attr('id','created-'+paper._id);
    $('#paper-updated').attr('id','updated-'+paper._id);
    $('#thumbnail-'+paper._id).click(function (event) {
        handlePaperSelection(event);
    });
}

function handlePaperSelection(event) {
    console.log(event.currentTarget.id);
    var data = $("#"+event.currentTarget.id).find('div[id*="image-"]').children();
    var paper = {
        _id: data[0].id,
        title: $('#'+data[0].id).attr('data-title'),
        created: $('#'+data[0].id).attr('data-created'),
        modified: $('#'+data[0].id).attr('data-updated'),
        tags: $('#'+data[0].id).attr('data-tags')
    };
    $('#paper-settings-id').attr('data-id',paper._id);
    $('#paper-settings-title-input').val(paper.title);
    $('#paper-settings-created').html(paper.created);
    $('#paper-settings-updated').html(paper.modified);
    $('#paper-settings-tag-input').importTags(paper.tags);
}

function getPaper(id){
    var i = 0;
    while (i<papers.length){
        if(papers[i]._id == id){
            return papers[i];
        }
        i++;
    }
}

function removePaper(id){
    var i = 0;
    while (i<papers.length){
        if(papers[i]._id == id){
            papers.splice(i,1);
            i = papers.length;
        }
        i++;
    }
}

function navSignedInState(){
    $('#sign-in-nav').slideUp();
    $('#sign-out-nav').slideDown();
}

function navSignedOutState(){
    $('#sign-in-nav').slideDown();
    $('#sign-out-nav').slideUp();
}

function papersEmptyState(){
    $('#btn-start').show();
    $('#search').slideUp();
    $('#dashboard').slideUp();
    $('#nav-search').fadeOut();
    $('#nav-search').fadeOut();
    $('#nav-dashboard').fadeOut();
}

function papersFilledState(){
    $('#btn-start').hide();
    $('#search').slideDown();
    $('#dashboard').slideDown();
    $('#nav-search').fadeIn();
    $('#nav-dashboard').fadeIn();
}

function throwPageBroadcast(message){
    $('#page-broadcast-content').empty();
    $('#page-broadcast-content').append(message);
    $('#page-broadcast').show().animate({ top:"-=15px",opacity:1.0 }, "slow");
    $('#page-broadcast').delay(2400).animate({ top:"+=15px",opacity:0 }, "slow",function(){
        $('#page-broadcast').hide();
    });
}
function throwSignInError(message){
    $('#sign-in-error').empty();
    $('#sign-in-error').append(message);
    $('#sign-in-error').slideDown();
    $('#sign-in-error').delay(2400).slideUp();
}
function throwSignInSuccess(message){
    $('#sign-in-success').empty();
    $('#sign-in-success').append(message);
    $('#sign-in-success').slideDown();
    $('#sign-in-success').delay(2400).slideUp();
}
function throwSignUpError(message){
    $('#sign-up-error').empty();
    $('#sign-up-error').append(message);
    $('#sign-up-error').slideDown();
    $('#sign-up-error').delay(2400).slideUp();
}

//extensions

Array.prototype.clear = function() {
  while (this.length > 0) {
    this.pop();
  }
};

jQuery.extend({
    getValues: function(url) {
        var result = null;
        $.ajax({
            url: url,
            type: 'get',
            async: false,
            success: function(data) {
                result = data;
            }
        });
       return result;
    }
});

Date.prototype.formatDateTime = function(){
    var hours = this.getHours();
    var minutes = this.getMinutes();
    var seconds = this.getSeconds();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    seconds = seconds < 10 ? '0'+seconds : seconds;
    return (this.getMonth() + 1) +
    "/" +  this.getDate() +
    "/" +  this.getFullYear().toString().substr(2,3) + " "
    + hours + ":"
    + minutes + ":"
    + seconds + " "
    + ampm;
};


String.prototype.trimLeft = function() {
    return this.replace(/^\s+/, "");
};

String.prototype.trimRight = function() {
    return this.replace(/\s+$/, "");
};

Array.prototype.map = function(callback, thisArg) {
    for (var i=0, n=this.length, a=[]; i<n; i++) {
        if (i in this) a[i] = callback.call(thisArg, this[i]);
    }
    return a;
};

function getCookies() {
    var c = document.cookie, v = 0, cookies = {};
    if (document.cookie.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
        c = RegExp.$1;
        v = 1;
    }
    if (v === 0) {
        c.split(/[,;]/).map(function(cookie) {
            var parts = cookie.split(/=/, 2),
                name = decodeURIComponent(parts[0].trimLeft()),
                value = parts.length > 1 ? decodeURIComponent(parts[1].trimRight()) : null;
            cookies[name] = value;
        });
    } else {
        c.match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g).map(function($0, $1) {
            var name = $0,
                value = $1.charAt(0) === '"'
                          ? $1.substr(1, -1).replace(/\\(.)/g, "$1")
                          : $1;
            cookies[name] = value;
        });
    }
    return cookies;
}

function getCookie(name) {
    return getCookies()[name];
}


