import React from 'react';
import MailPoet from 'mailpoet';
import { assign, compose, find } from 'lodash/fp';
import Select from 'common/form/react_select/react_select';

import {
  OnFilterChange, SegmentTypes,
  SelectOption,
  WooCommerceSubscriptionFormItem,
} from '../types';
import { SegmentFormData } from '../segment_form_data';

export const WooCommerceSubscriptionOptions = [
  { value: 'hasActiveSubscription', label: MailPoet.I18n.t('segmentsActiveSubscription'), group: SegmentTypes.WooCommerceSubscription },
];

export function validateWooCommerceSubscription(
  formItems: WooCommerceSubscriptionFormItem
): boolean {
  if (formItems.action === 'hasActiveSubscription' && !formItems.product_id) {
    return false;
  }
  return true;
}

interface Props {
  onChange: OnFilterChange;
  item: WooCommerceSubscriptionFormItem;
}

export const WooCommerceSubscriptionFields: React.FunctionComponent<Props> = (
  { onChange, item }
) => {
  const productOptions = SegmentFormData.subscriptionProducts?.map((product) => ({
    value: product.id,
    label: product.name,
  }));

  return (
    <div className="mailpoet-form-field">
      <div className="mailpoet-form-input mailpoet-form-select">
        <Select
          placeholder={MailPoet.I18n.t('selectWooSubscription')}
          options={productOptions}
          value={find(['value', item.product_id], productOptions)}
          onChange={(option: SelectOption): void => compose([
            onChange,
            assign(item),
          ])({ product_id: option.value })}
        />
      </div>
    </div>
  );
};