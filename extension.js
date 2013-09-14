/* -*- Mode: js2; indent-tabs-mode: nil; c-basic-offset: 2; tab-width: 2 -*-  */
/*
 * extension.js
 * Copyright (C) 2013 Daniel Sheeeler <six600110@pobox.com>
 * 
 * clutter-clock is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * clutter-clock is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Clutter = imports.gi.Clutter;

const GMenu = imports.gi.GMenu;
const Lang = imports.lang;
const Shell = imports.gi.Shell;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// Other javascript files in the clutter_clock@six600110.pobox.com directory are accesible via Extension.<file name>
const Extension = imports.misc.extensionUtils.getCurrentExtension();

let text = null;
let button, texture, button_press_connection;
let spinning = false;
let appsMenuButton;
let background_color;
let monitor;

const AppMenuItem = new Lang.Class({
    Name: 'AppsMenu.AppMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function (app, params) {
        this.parent(params);

        this._app = app;
        this.label = new St.Label({ text: app.get_name() });
        this.addActor(this.label);
        this._icon = app.create_icon_texture(ICON_SIZE);
        this.addActor(this._icon, { expand: false });
    },

    activate: function (event) {
      this._app.activate_full(-1, event.get_time());
      this.parent(event);
    }

});

const ApplicationsButton = new Lang.Class({
    Name: 'AppsMenu.ApplicationsButton',
    Extends: PanelMenu.SystemStatusButton,

    _init: function() {
        this.monitor = Main.layoutManager.primaryMonitor;
        this.parent('preferences-system-time-symbolic');
        this._clockToggle = new PopupMenu.PopupSwitchMenuItem(_("Show Clutter Clock"), false, { style_class: 'popup-subtitle-menu-item' });
        this._clockToggle.connect('toggled', Lang.bind(this, this._onToggled));
        this.menu.addMenuItem(this._clockToggle);

        this._spinToggle = new PopupMenu.PopupSwitchMenuItem(_("Spinning"), false, { style_class: 'popup-subtitle-menu-item' });
        this._spinToggle.connect('toggled', Lang.bind(this, this._onToggledSpin));
        this.menu.addMenuItem(this._spinToggle);

        let red, green, blue, tmpOpacity, scalex, scaley, x, y;
        red = 0;
        green = 0;
        blue = 0;
        tmpOpacity = 0;
        scalex = 1;
        scaley = 1;

        this._redSliderTitle = new PopupMenu.PopupMenuItem(_('Red ' + red), { reactive: false });
        this._redSlider =  new PopupMenu.PopupSliderMenuItem(red / 255.0);
        this._redSlider.connect("value-changed", Lang.bind(this, this._redSliderValueChanged, null));

        this._opacitySliderTitle = new PopupMenu.PopupMenuItem(_('Opacity ' + tmpOpacity), { reactive: false });
        this._opacitySlider = new PopupMenu.PopupSliderMenuItem(tmpOpacity / 255.0);
        this._opacitySlider.connect("value-changed", Lang.bind(this, this._opacitySliderValueChanged, null));

        this._greenSliderTitle = new PopupMenu.PopupMenuItem(_('Green ' + green), { reactive: false });
        this._greenSlider =  new PopupMenu.PopupSliderMenuItem(green / 255.0);
        this._greenSlider.connect("value-changed", Lang.bind(this, this._greenSliderValueChanged, null));

        this._blueSliderTitle = new PopupMenu.PopupMenuItem(_('Blue ' + blue), { reactive: false });
        this._blueSlider =  new PopupMenu.PopupSliderMenuItem(blue / 255.0);
        this._blueSlider.connect("value-changed", Lang.bind(this, this._blueSliderValueChanged, null));

        this._scalexSliderTitle = new PopupMenu.PopupMenuItem(_('scalex ' + scalex), { reactive: false });
        this._scalexSlider =  new PopupMenu.PopupSliderMenuItem(1);
        this._scalexSlider.connect("value-changed", Lang.bind(this, this._scalexSliderValueChanged, null));

        this._scaleySliderTitle = new PopupMenu.PopupMenuItem(_('scaley ' + scaley), { reactive: false });
        this._scaleySlider =  new PopupMenu.PopupSliderMenuItem(1);
        this._scaleySlider.connect("value-changed", Lang.bind(this, this._scaleySliderValueChanged, null));

        this._xSliderTitle = new PopupMenu.PopupMenuItem(_('x'), { reactive: false });
        this._xSlider =  new PopupMenu.PopupSliderMenuItem(0);
        this._xSlider.connect("value-changed", Lang.bind(this, this._xSliderValueChanged, null));

        this._ySliderTitle = new PopupMenu.PopupMenuItem(_('y'), { reactive: false });
        this._ySlider =  new PopupMenu.PopupSliderMenuItem(1);
        this._ySlider.connect("value-changed", Lang.bind(this, this._ySliderValueChanged, null));


        this.menu.addMenuItem(this._opacitySliderTitle);
        this.menu.addMenuItem(this._opacitySlider);

        this.menu.addMenuItem(this._redSliderTitle);
        this.menu.addMenuItem(this._redSlider);

        this.menu.addMenuItem(this._greenSliderTitle);
        this.menu.addMenuItem(this._greenSlider);

        this.menu.addMenuItem(this._blueSliderTitle);
        this.menu.addMenuItem(this._blueSlider);

        this.menu.addMenuItem(this._scalexSliderTitle);
        this.menu.addMenuItem(this._scalexSlider);

        this.menu.addMenuItem(this._scaleySliderTitle);
        this.menu.addMenuItem(this._scaleySlider);

        this.menu.addMenuItem(this._xSliderTitle);
        this.menu.addMenuItem(this._xSlider);

        this.menu.addMenuItem(this._ySliderTitle);
        this.menu.addMenuItem(this._ySlider);

        this._appSys = Shell.AppSystem.get_default();
      
    },
 
    _redSliderValueChanged: function(slider) {
      if (text) {
          let node = text.get_theme_node();
          let bg_color = node.get_background_color();
          bg_color.red = slider._value * 255;
          text.set_style(text.get_style() + ' background-color: rgba(' + bg_color.red + 
                         ',' + bg_color.green + ',' + bg_color.blue + ',' + 
                         bg_color.alpha / 255.0 + ');');

          //text.set_style(text.get_style() + ' background: rgba(0,0,0,' + slider._value + ');');
          //text.background_color = new Clutter.Color({ red: text.background_color.red,
          //                       green : text.background_color.green,
          //                       blue : text.background_color.blue,
          //                       alpha: slider._value * 255});      
          this._redSliderTitle.label.set_text(_("Red " + bg_color.red));
      }
    },

    _greenSliderValueChanged: function(slider) {
      if (text) {
          let node = text.get_theme_node();
          let bg_color = node.get_background_color();
          bg_color.green = slider._value * 255;
          text.set_style(text.get_style() + ' background-color: rgba(' + bg_color.red + 
                         ',' + bg_color.green + ',' + bg_color.blue + ',' + 
                         bg_color.alpha / 255.0 + ');');

          //text.set_style(text.get_style() + ' background: rgba(0,0,0,' + slider._value + ');');
          //text.background_color = new Clutter.Color({ red: text.background_color.red,
          //                       green : text.background_color.green,
          //                       blue : text.background_color.blue,
          //                       alpha: slider._value * 255});      
          this._greenSliderTitle.label.set_text(_("Green " + bg_color.green));
      }
    },

    _blueSliderValueChanged: function(slider) {
      if (text) {
          let node = text.get_theme_node();
          let bg_color = node.get_background_color();
          bg_color.blue = slider._value * 255;
          text.set_style(text.get_style() + ' background-color: rgba(' + bg_color.red + 
                         ',' + bg_color.green + ',' + bg_color.blue + ',' + 
                         bg_color.alpha / 255.0 + ');');

          //text.set_style(text.get_style() + ' background: rgba(0,0,0,' + slider._value + ');');
          //text.background_color = new Clutter.Color({ red: text.background_color.red,
          //                       green : text.background_color.green,
          //                       blue : text.background_color.blue,
          //                       alpha: slider._value * 255});      
          this._blueSliderTitle.label.set_text(_("Blue " + bg_color.blue));
      }
    },

    _scalexSliderValueChanged: function(slider) {
      if (text) {

          text.scale_x = slider._value;
          this._scalexSliderTitle.label.set_text(_("scalex " + slider._value));
      }
    },

    _scaleySliderValueChanged: function(slider) {
      if (text) {
          text.scale_y = slider._value;

          this._scaleySliderTitle.label.set_text(_("scaley " + slider._value));
      }
    },

    _opacitySliderValueChanged: function(slider) {
      if (text) {
          let node = text.get_theme_node();
          let bg_color = node.get_background_color();
          bg_color.alpha = slider._value * 255;
          text.set_style(text.get_style() + ' background-color: rgba(' + bg_color.red + 
                         ',' + bg_color.green + ',' + bg_color.blue + ',' + 
                         bg_color.alpha / 255.0 + ');');

        //text.background_color = new Clutter.Color({ red: text.background_color.red,
        //                       green : text.background_color.green,
        //                       blue : text.background_color.blue,
        //                       alpha: slider._value * 255});      
        this._opacitySliderTitle.label.set_text(_("Opacity " + bg_color.alpha));
      }
    },

    _xSliderValueChanged: function(slider) {
      if (text) {
          text.x = Math.floor(this.monitor.width - text.width*text.scale_x) * slider._value;
          this._xSliderTitle.label.set_text(_("x " + text.x));
      }
    },

    _ySliderValueChanged: function(slider) {
      if (text) {
          text.y = Math.floor(this.monitor.height - text.height*text.scale_y) * slider._value;
          this._ySliderTitle.label.set_text(_("y " + text.y));
      }
    },

    _onToggledSpin: function(item) {
      if (item.state) {
            spinning = true;
            _spin();
      } else {
            spinning = false;
      }
    },    

    _onToggled: function(item) {
      if (item.state) {
        _showClock(); 
      } else {
        _hideClock();
      }
    },

    destroy: function() {
     
        this.parent();
    },

});



function _hideClock() {
  if (text) {
  text.hide();
   
  }
}

function _showClock() {

 
  text.show(); 

  _updateSeconds();
  _spin();
 // _change_background_color();
}

function _change_background_color() {
    var red = 255*Math.random();
    var green = 255*Math.random();
    var blue = 255*Math.random();
    var alpha = 255*Math.random();
    var color = new Clutter.Color({ red: red, green: green, blue: blue, alpha: alpha});
          //                       green : text.background_color.green,
          //                       blue : text.background_color.blue,
          //                       alpha: slider._value * 255})
    Tweener.addTween(text, {'background-color': color, onComplete: _change_background_color, time: 5});
}

function _updateSeconds() {
  
  text.set_text(new Date().toLocaleFormat(C_("event list time", "%H:%M:%S")));
  Tweener.addTween(text,{ onComplete: _updateSeconds, time: 0.5});

}

function _spin() {
if (spinning == true) {
  if (text) {
    text.rotation_angle_z = 0;
    Tweener.addTween(text,
      { 
       rotation_angle_z: -360,
       time: 5,
       transition: 'linear',
       onComplete: _spin 
      }
    );
  }
}
}

function init() {
    text = new St.Label({ style: 'border: 10px solid black; border-radius: 100px; padding: 0.2em; background: #005555; font-family: ubuntu;' +
     'font-size: 420px; font-weight: bold; color: #ffffff; background: rgba(0,0,0,0);', text: "Clutter Clock" }); 
    // text.set_style(text.get_style() + ' background: rgba(0,0,0,0.3);');
    //text.font_name = 'ubuntu';
    //text.
    //text.padding = '0.2em';
    //text.border = '10px solid black';
    //text.border_radius = '100px';
    //text.rotation_angle_z = 0;
   // 
    text.set_pivot_point(0.5, 0.5);
    //text.set_position(Math.floor(monitor.width / 2 - text.width / 2),
    //                  Math.floor(monitor.height / 2 - text.height / 2));

    appsMenuButton = new ApplicationsButton();

}

function enable() {
  Main.panel.addToStatusArea('clutter_clock', appsMenuButton);

  Main.uiGroup.add_actor(text);
  text.hide();
}

function disable() {
  Main.panel._rightBox.remove_actor(button);
}

