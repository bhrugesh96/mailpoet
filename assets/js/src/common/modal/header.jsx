import React from 'react';
import PropTypes from 'prop-types';

import closeIcon from './close_icon.jsx';

const ModalHeader = ({
  title,
  onClose,
  isDismissible,
}) => (
  <div className="mailpoet-modal-header">
    <div className="mailpoet-modal-header-heading-container">
      <h1 className="mailpoet-modal-header-heading">
        { title }
      </h1>
    </div>
    { isDismissible && (
      <button type="button" onClick={onClose} className="mailpoet-modal-close">{closeIcon}</button>
    ) }
  </div>
);

ModalHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  isDismissible: PropTypes.bool,
};

ModalHeader.defaultProps = {
  onClose: () => {},
  isDismissible: true,
};

export default ModalHeader;
