import { Icon } from './icon';
import { Edit } from './edit';
import { StepType } from '../../../../editor/store/types';

export const step: StepType = {
  key: 'mailpoet:send-email',
  group: 'actions',
  title: 'Send email',
  description: 'An email will be sent to subscriber',
  icon: Icon,
  edit: Edit,
} as const;