import React from 'react';
import { Field, getIn, FieldProps } from 'formik';
import { Box, Label, Input, DefaultThemeProps, ThemedComponentProps, extractThemableProps } from '@deity/falcon-ui';
import { toGridTemplate } from './helpers';

export enum FormInputAreas {
  label = 'label',
  input = 'input',
  error = 'error'
}

const formInputLayout: DefaultThemeProps = {
  formInputLayout: {
    display: 'grid',
    gridGap: 'none',
    my: 'xs',
    // prettier-ignore
    gridTemplate: toGridTemplate([
      ['1fr'                ],
      [FormInputAreas.label ],
      [FormInputAreas.input ],
      [FormInputAreas.error ]
    ])
  }
};

const errorLayout: DefaultThemeProps = {
  errorLayout: {
    gridArea: `${FormInputAreas.input}-start /  ${FormInputAreas.input}-start / ${FormInputAreas.error}-end / ${
      FormInputAreas.error
    }-end`,
    color: 'error',
    fontSize: 'xs',
    mr: 'xs',
    css: {
      pointerEvents: 'none',
      justifySelf: 'end'
    }
  }
};

export type Validator = (value: string, label: string) => string | undefined;

export type FormInputProps = {
  label: string;
  name: string;
  validators?: Validator[];
} & ThemedComponentProps &
  React.InputHTMLAttributes<HTMLInputElement>;

// TODO: move validators to separate file?
// TODO: when new i18n support is ready use it to translate validation messages
const validEmailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const requiredValidator: Validator = (value, label) => (!value ? `${label} is required` : undefined);

const emailValidator: Validator = value => {
  if (!value || !validEmailRegex.test(value.toLowerCase())) {
    return ' Email is invalid';
  }

  return undefined;
};

const validPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

const passwordValidator: Validator = value => {
  if (!value || value.length < 8) {
    return 'Please enter a password with at least 8 characters';
  }

  if (!validPasswordRegex.test(value)) {
    return 'Please use at least one lower, upper case char and digit';
  }
  return undefined;
};

const validateSequentially = (validators: Validator[] = [], label: string) => (value: string) => {
  const firstInvalid = validators.find(validator => validator(value, label) !== undefined);
  return firstInvalid ? firstInvalid(value, label) : undefined;
};

const getDefaultInputTypeValidator = (inputType: string | undefined) => {
  switch (inputType) {
    case 'password':
      return passwordValidator;
    case 'email':
      return emailValidator;
    default:
      return undefined;
  }
};

// TODO: when new i18n support is ready use it to translate label and placeholder props
export const FormInput: React.SFC<FormInputProps> = ({ label, required, name, validators, ...remaingProps }) => {
  const hasCustomValidators = validators !== undefined;
  const inputType = remaingProps.type;

  if (required) {
    if (!validators) {
      validators = [];
    }
    validators.unshift(requiredValidator);
  }

  const defaultInputTypeValidator = !hasCustomValidators && getDefaultInputTypeValidator(inputType);

  if (defaultInputTypeValidator && validators) {
    validators.push(defaultInputTypeValidator);
  }

  return (
    <Field
      name={name}
      validate={validateSequentially(validators, label)}
      render={(fieldProps: FieldProps) => {
        const { themableProps, rest } = extractThemableProps(remaingProps);

        const { field, form } = fieldProps;
        const touch = getIn(form.touched, name);
        const error = getIn(form.errors, name);
        const invalid = !!touch && !!error;

        return (
          <Box defaultTheme={formInputLayout} {...themableProps}>
            <Label htmlFor={name} gridArea={FormInputAreas.label}>
              {label}
            </Label>
            <Input {...field} {...rest} gridArea={FormInputAreas.input} id={name} invalid={invalid} />
            <Box defaultTheme={errorLayout}>{invalid ? error : null}</Box>
          </Box>
        );
      }}
    />
  );
};
