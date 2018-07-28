/* eslint-disable func-names */
define([
  'newsletter_editor/App',
  'newsletter_editor/components/communication',
  'mailpoet',
  'notice',
  'backbone',
  'backbone.marionette',
  'jquery',
  'blob',
  'file-saver',
  'common/thumbnail.jsx',
  'underscore',
  'jquery'
], function (
  App,
  CommunicationComponent,
  MailPoet,
  Notice,
  Backbone,
  Marionette,
  jQuery,
  Blob,
  FileSaver,
  Thumbnail,
  _,
  $
) {
  'use strict';

  var Module = {};
  var saveTimeout;

  // Save editor contents to server
  Module.save = function () {
    var json = App.toJSON();

    // Stringify to enable transmission of primitive non-string value types
    if (!_.isUndefined(json.body)) {
      json.body = JSON.stringify(json.body);
    }

    App.getChannel().trigger('beforeEditorSave', json);

    // save newsletter
    return CommunicationComponent.saveNewsletter(json).done(function (response) {
      if (response.success !== undefined && response.success === true) {
        // TODO: Handle translations
        // MailPoet.Notice.success("<?php _e('Newsletter has been saved.'); ?>");
      } else if (response.error !== undefined) {
        if (response.error.length === 0) {
          MailPoet.Notice.error(
            MailPoet.I18n.t('templateSaveFailed'),
            {
              scroll: true
            }
          );
        } else {
          $(response.error).each(function (i, error) {
            MailPoet.Notice.error(error, { scroll: true });
          });
        }
      }
      if (!_.isUndefined(json.body)) {
        json.body = JSON.parse(json.body);
      }
      App.getChannel().trigger('afterEditorSave', json, response);
    }).fail(function (response) {
      // TODO: Handle saving errors
      App.getChannel().trigger('afterEditorSave', {}, response);
    });
  };

  Module.saveTemplate = function (options) {
    return Thumbnail.fromNewsletter(App.toJSON())
      .then(function (thumbnail) {
        var data = _.extend(options || {}, {
          thumbnail: thumbnail,
          body: JSON.stringify(App.getBody()),
          categories: JSON.stringify([
            'saved',
            App.getNewsletter().get('type')
          ])
        });

        return MailPoet.Ajax.post({
          api_version: window.mailpoet_api_version,
          endpoint: 'newsletterTemplates',
          action: 'save',
          data: data
        });
      });
  };

  Module.exportTemplate = function (options) {
    return Thumbnail.fromNewsletter(App.toJSON())
      .then(function (thumbnail) {
        var data = _.extend(options || {}, {
          thumbnail: thumbnail,
          body: App.getBody(),
          categories: JSON.stringify(['saved', App.getNewsletter().get('type')])
        });
        var blob = new Blob(
          [JSON.stringify(data)],
          { type: 'application/json;charset=utf-8' }
        );

        FileSaver.saveAs(blob, 'template.json');
        MailPoet.trackEvent('Editor > Template exported', {
          'MailPoet Free version': window.mailpoet_version
        });
      });
  };

  Module.SaveView = Marionette.View.extend({
    getTemplate: function () { return window.templates.save; },
    templateContext: function () {
      return {
        wrapperClass: this.wrapperClass
      };
    },
    events: {
      'click .mailpoet_save_button': 'save',
      'click .mailpoet_save_show_options': 'toggleSaveOptions',
      'click .mailpoet_save_next': 'next',
      /* Save as template */
      'click .mailpoet_save_template': 'toggleSaveAsTemplate',
      'click .mailpoet_save_as_template': 'saveAsTemplate',
      /* Export template */
      'click .mailpoet_save_export': 'toggleExportTemplate',
      'click .mailpoet_export_template': 'exportTemplate'
    },

    initialize: function () {
      this.setDropdownDirectionDown();
      App.getChannel().on('beforeEditorSave', this.beforeSave, this);
      App.getChannel().on('afterEditorSave', this.afterSave, this);
    },
    setDropdownDirectionDown: function () {
      this.wrapperClass = 'mailpoet_save_dropdown_down';
    },
    setDropdownDirectionUp: function () {
      this.wrapperClass = 'mailpoet_save_dropdown_up';
    },
    onRender: function () {
      this.validateNewsletter(App.toJSON());
    },
    save: function () {
      this.hideOptionContents();
      App.getChannel().request('save');
    },
    beforeSave: function () {
      // TODO: Add a loading animation instead
      this.$('.mailpoet_autosaved_at').text(MailPoet.I18n.t('saving'));
    },
    afterSave: function (json) {
      this.validateNewsletter(json);
      // Update 'Last saved timer'
      this.$('.mailpoet_editor_last_saved').removeClass('mailpoet_hidden');
      this.$('.mailpoet_autosaved_at').text('');
    },
    toggleSaveOptions: function () {
      this.$('.mailpoet_save_options').toggleClass('mailpoet_hidden');
      this.$('.mailpoet_save_show_options').toggleClass('mailpoet_save_show_options_active');
    },
    toggleSaveAsTemplate: function () {
      this.$('.mailpoet_save_as_template_container').toggleClass('mailpoet_hidden');
      this.toggleSaveOptions();
    },
    showSaveAsTemplate: function () {
      this.$('.mailpoet_save_as_template_container').removeClass('mailpoet_hidden');
      this.toggleSaveOptions();
    },
    hideSaveAsTemplate: function () {
      this.$('.mailpoet_save_as_template_container').addClass('mailpoet_hidden');
    },
    saveAsTemplate: function () {
      var templateName = this.$('.mailpoet_save_as_template_name').val();
      var that = this;

      if (templateName === '') {
        MailPoet.Notice.error(
          MailPoet.I18n.t('templateNameMissing'),
          {
            positionAfter: that.$el,
            scroll: true
          }
        );
      } else {
        Module.saveTemplate({
          name: templateName
        }).then(function () {
          MailPoet.Notice.success(
            MailPoet.I18n.t('templateSaved'),
            {
              positionAfter: that.$el,
              scroll: true
            }
          );
          MailPoet.trackEvent('Editor > Template saved', {
            'MailPoet Free version': window.mailpoet_version
          });
        }).catch(function () {
          MailPoet.Notice.error(
            MailPoet.I18n.t('templateSaveFailed'),
            {
              positionAfter: that.$el,
              scroll: true
            }
          );
        });
        this.hideOptionContents();
      }
    },
    toggleExportTemplate: function () {
      this.$('.mailpoet_export_template_container').toggleClass('mailpoet_hidden');
      this.toggleSaveOptions();
    },
    hideExportTemplate: function () {
      this.$('.mailpoet_export_template_container').addClass('mailpoet_hidden');
    },
    exportTemplate: function () {
      var templateName = this.$('.mailpoet_export_template_name').val();
      var that = this;

      if (templateName === '') {
        MailPoet.Notice.error(
          MailPoet.I18n.t('templateNameMissing'),
          {
            positionAfter: that.$el,
            scroll: true
          }
        );
      } else {
        Module.exportTemplate({
          name: templateName
        });
        this.hideExportTemplate();
      }
    },
    hideOptionContents: function () {
      this.hideSaveAsTemplate();
      this.hideExportTemplate();
      this.$('.mailpoet_save_options').addClass('mailpoet_hidden');
    },
    next: function () {
      this.hideOptionContents();
      if (!this.$('.mailpoet_save_next').hasClass('button-disabled')) {
        Module._cancelAutosave();
        Module.save().done(function () {
          window.location.href = App.getConfig().get('urls.send');
        });
      }
    },
    validateNewsletter: function (jsonObject) {
      var contents;
      if (!App._contentContainer.isValid()) {
        this.showValidationError(App._contentContainer.validationError);
        return;
      }

      contents = JSON.stringify(jsonObject);
      if (App.getConfig().get('validation.validateUnsubscribeLinkPresent') &&
          contents.indexOf('[link:subscription_unsubscribe_url]') < 0 &&
          contents.indexOf('[link:subscription_unsubscribe]') < 0) {
        this.showValidationError(MailPoet.I18n.t('unsubscribeLinkMissing'));
        return;
      }

      if ((App.getNewsletter().get('type') === 'notification') &&
        contents.indexOf('"type":"automatedLatestContent"') < 0 &&
        contents.indexOf('"type":"automatedLatestContentLayout"') < 0
      ) {
        this.showValidationError(MailPoet.I18n.t('automatedLatestContentMissing'));
        return;
      }

      this.hideValidationError();
    },
    showValidationError: function (message) {
      var $el = this.$('.mailpoet_save_error');
      $el.text(message);
      $el.removeClass('mailpoet_hidden');

      this.$('.mailpoet_save_next').addClass('button-disabled');
    },
    hideValidationError: function () {
      this.$('.mailpoet_save_error').addClass('mailpoet_hidden');
      this.$('.mailpoet_save_next').removeClass('button-disabled');
    }
  });

  Module.autoSave = function () {
    // Delay in saving editor contents, during which a new autosave
    // may be requested
    var AUTOSAVE_DELAY_DURATION = 1000;

    Module._cancelAutosave();
    saveTimeout = setTimeout(function () {
      App.getChannel().request('save').always(function () {
        Module._cancelAutosave();
      });
    }, AUTOSAVE_DELAY_DURATION);
  };

  Module._cancelAutosave = function () {
    if (!saveTimeout) return;

    clearTimeout(saveTimeout);
    saveTimeout = undefined;
  };

  Module.beforeExitWithUnsavedChanges = function (e) {
    var message;
    var event;
    if (saveTimeout) {
      message = MailPoet.I18n.t('unsavedChangesWillBeLost');
      event = e || window.event;

      if (event) {
        event.returnValue = message;
      }

      return message;
    }
    return undefined;
  };

  App.on('before:start', function (BeforeStartApp) {
    var Application = BeforeStartApp;
    Application.save = Module.save;
    Application.getChannel().on('autoSave', Module.autoSave);

    window.onbeforeunload = Module.beforeExitWithUnsavedChanges;

    Application.getChannel().reply('save', Application.save);
  });

  App.on('start', function (BeforeStartApp) {
    var topSaveView = new Module.SaveView();
    var bottomSaveView = new Module.SaveView();
    bottomSaveView.setDropdownDirectionUp();

    BeforeStartApp._appView.showChildView('topRegion', topSaveView);
    BeforeStartApp._appView.showChildView('bottomRegion', bottomSaveView);
  });

  return Module;
});
