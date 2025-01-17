import { Icon } from '../custom_text/icon.jsx';
import { CustomCheckboxEdit } from './edit.jsx';
import { customFieldValuesToBlockValues } from '../../store/form_body_to_blocks.jsx';

export const name = 'mailpoet-form/custom-checkbox';

export function getSettings(customField) {
  return {
    title: customField.name,
    description: '',
    icon: Icon,
    category: 'custom-fields',
    attributes: {
      label: {
        type: 'string',
        default: customField.name,
      },
      hideLabel: {
        type: 'boolean',
        default: false,
      },
      values: {
        type: 'array',
        default: customField.params.values
          ? customFieldValuesToBlockValues(customField.params.values)
          : [],
      },
      mandatory: {
        type: 'boolean',
        default: customField.params.required
          ? !!customField.params.required
          : false,
      },
      customFieldId: {
        type: 'string',
        default: customField.id,
      },
    },
    supports: {
      html: false,
      multiple: false,
    },
    edit: CustomCheckboxEdit,
    save() {
      return null;
    },
  };
}
