import { Component } from 'react';
import PropTypes from 'prop-types';
import ReactStringReplace from 'react-string-replace';
import { MailPoet } from 'mailpoet';
import { FormFieldText } from 'form/fields/text.jsx';
import { SenderEmailAddressWarning } from 'common/sender_email_address_warning.jsx';
import {
  isFieldValid,
  addOrUpdateError,
  removeError,
  validateField,
} from 'common/functions/parsley_helper_functions';
import { checkSenderEmailDomainDmarcPolicy } from 'common/check_sender_domain_dmarc_policy';

class SenderField extends Component {
  constructor(props) {
    super(props);
    this.state = {
      emailAddress: props.item.sender_address,
    };
    this.onChange = this.onChange.bind(this);
    this.onBlur = this.onBlur.bind(this);

    const fieldId = props.field.id || `field_${props.field.name}`;
    this.domElementSelector = `#${fieldId}`;
    this.parsleyFieldName = 'invalidFromAddress';
    this.parsleySenderDomainFieldName = 'invalidSenderDomain';
  }

  onChange(event) {
    const emailAddress = event.target.value.toLowerCase();
    this.setState({
      emailAddress,
    });
    this.props.onValueChange({
      ...event,
      target: {
        ...event.target,
        name: event.target.name,
        value: emailAddress,
      },
    });
    // hide email address warning when user is typing
    removeError(this.domElementSelector, this.parsleyFieldName);
    removeError(this.domElementSelector, this.parsleySenderDomainFieldName);
  }

  onBlur() {
    const emailAddress = this.state.emailAddress;
    const emailAddressIsAuthorized =
      this.isEmailAddressAuthorized(emailAddress);

    this.showSenderFieldError(emailAddressIsAuthorized, emailAddress);

    checkSenderEmailDomainDmarcPolicy(emailAddress)
      .then((status) => {
        this.showSenderDomainError(status, emailAddress);
      })
      .catch(() => {
        // do nothing for now when the request fails
      });
  }

  isEmailAddressAuthorized = (email) =>
    (window.mailpoet_authorized_emails || []).includes(email);

  showInvalidFromAddressError = (emailAddress) => {
    const fromAddress = emailAddress;
    let errorMessage = ReactStringReplace(
      MailPoet.I18n.t('newsletterInvalidFromAddress'),
      '%1$s',
      () => fromAddress,
    );
    errorMessage = ReactStringReplace(
      errorMessage,
      /\[link\](.*?)\[\/link\]/g,
      (match) =>
        `<a href="https://account.mailpoet.com/authorization?email=${encodeURIComponent(
          fromAddress,
        )}" target="_blank" class="mailpoet-js-button-authorize-email-and-sender-domain" data-email="${fromAddress}" data-type="email" rel="noopener noreferrer">${match}</a>`,
    );

    addOrUpdateError(
      this.domElementSelector,
      this.parsleyFieldName,
      errorMessage.join(''),
    );
  };

  showSenderFieldError = (emailAddressIsAuthorized, emailAddress) => {
    if (!window.mailpoet_mss_active) return;

    removeError(this.domElementSelector, this.parsleyFieldName);

    if (!isFieldValid(this.domElementSelector)) {
      validateField(this.domElementSelector);
      return;
    }

    if (!emailAddressIsAuthorized) {
      this.showInvalidFromAddressError(emailAddress);
    }
  };

  showSenderDomainError = (status, emailAddress) => {
    if (!status) return;

    const errorMessage = ReactStringReplace(
      MailPoet.I18n.t('authorizeSenderDomain'),
      /\[link\](.*?)\[\/link\]/g,
      (match) =>
        `<a href="https://kb.mailpoet.com/article/295-spf-and-dkim" target="_blank" class="mailpoet-js-button-authorize-email-and-sender-domain" data-email="${emailAddress}" data-type="domain" rel="noopener noreferrer">${match}</a>`,
    );

    addOrUpdateError(
      this.domElementSelector,
      this.parsleySenderDomainFieldName,
      errorMessage,
    );
  };

  render() {
    return (
      <>
        <FormFieldText
          item={{
            ...this.props.item,
            sender_address: this.state.emailAddress,
          }}
          field={this.props.field}
          onValueChange={this.onChange}
          onBlurEvent={this.onBlur}
        />

        <div className="regular-text" style={{ marginTop: '2rem' }}>
          <SenderEmailAddressWarning
            emailAddress={this.state.emailAddress}
            mssActive={window.mailpoet_mss_active}
          />
        </div>
      </>
    );
  }
}

SenderField.propTypes = {
  field: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  item: PropTypes.shape({
    sender_address: PropTypes.string.isRequired,
  }).isRequired,
  onValueChange: PropTypes.func,
};

SenderField.defaultProps = {
  onValueChange: function onValueChange() {
    // no-op
  },
};

export { SenderField };
