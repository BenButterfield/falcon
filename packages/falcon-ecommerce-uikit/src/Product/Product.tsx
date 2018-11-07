import React from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import { adopt } from 'react-adopt';
import { themed, Box, Text, H1, NumberInput, Button, Icon, FlexLayout } from '@deity/falcon-ui';
import { Breadcrumbs } from '../Breadcrumbs';
import { ProductGallery } from './ProductGallery';
import { ProductTranslations } from './ProductQuery';
import { ProductConfigurableOptions } from './ConfigurableOptions';
import { AddToCartMutation } from '../Cart';
import { ToggleMiniCartMutation } from '../MiniCart';
import { ProductConfigurator } from './ProductConfigurator';
import { Price } from '../Locale';
import { toGridTemplate } from '../helpers';

export const ProductLayout = themed({
  tag: 'div',
  defaultTheme: {
    productLayout: {
      display: 'grid',
      gridGap: 'sm',
      my: 'md'
    }
  }
});

enum Area {
  gallery = 'gallery',
  sku = 'sku',
  title = 'title',
  description = 'description',
  cta = 'cta',
  price = 'price',
  meta = 'meta',
  empty = 'empty',
  options = 'options',
  error = 'error'
}

export const ProductDetailsLayout = themed({
  tag: 'article',
  defaultTheme: {
    productDetailsLayout: {
      display: 'grid',
      gridGap: 'sm',

      gridTemplate: {
        // prettier-ignore
        xs: toGridTemplate([
          ['1fr'           ],
          [Area.title      ],
          [Area.sku        ],
          [Area.gallery    ],
          [Area.price      ],
          [Area.error      ],
          [Area.options    ],
          [Area.cta        ],
          [Area.description],
          [Area.meta       ]
        ]),
        // prettier-ignore
        md: toGridTemplate([
          ['1.5fr',        '1fr'                  ],
          [Area.gallery,   Area.sku               ],
          [Area.gallery,   Area.title             ],
          [Area.gallery,   Area.price             ],
          [Area.gallery,   Area.options           ],
          [Area.gallery,   Area.cta               ],
          [Area.gallery,   Area.error             ],
          [Area.gallery,   Area.description, '1fr'],
          [Area.gallery,   Area.meta              ]
        ])
      }
    }
  }
});

const ProductDescriptionLayout = themed({
  tag: 'div',

  defaultTheme: {
    productDescriptionLayout: {
      css: {
        p: {
          margin: 0
        }
      }
    }
  }
});

/**
 * Combine render props functions into one with react-adopt
 */
const ProductForm = adopt({
  // mutation provides toggle() method that allows us to show mini cart once product is added
  toggleMiniCartMutation: ({ render }) => (
    <ToggleMiniCartMutation>{toggle => render({ toggle })}</ToggleMiniCartMutation>
  ),

  // mutation provides addToCart method which should be called with proper data
  addToCartMutation: ({ render, toggleMiniCartMutation }) => (
    <AddToCartMutation onCompleted={() => toggleMiniCartMutation.toggle()}>
      {(addToCart, result) => render({ addToCart, result })}
    </AddToCartMutation>
  ),

  // formik handles form operations and triggers submit when onSubmit event is fired on the form
  formik: ({ sku, validate, addToCartMutation, render }) => (
    <Formik
      initialValues={{ qty: 1 }}
      validate={validate}
      onSubmit={(values: any) =>
        addToCartMutation.addToCart({
          variables: {
            input: {
              sku,
              ...values,
              qty: parseInt(values.qty, 10)
            }
          }
        })
      }
    >
      {(...props) => <Form>{render(...props)}</Form>}
    </Formik>
  ),

  // product configurator takes care about interactions between configurable product options and serializes
  // selected data into proper format so GraphQL can use it
  productConfigurator: ({ formik, render }) => (
    <ProductConfigurator
      onChange={(name: string, value: any) => formik.setFieldValue(name, value, !!formik.submitCount)}
    >
      {render}
    </ProductConfigurator>
  )
});

export class Product extends React.PureComponent<{ product: any; translations: ProductTranslations }> {
  createValidator(product: any) {
    const { translations } = this.props;
    return (values: any) => {
      const errors: any = {};

      // handle qty
      if (parseInt(values.qty, 10) < 1) {
        errors.qty = translations.error.qty;
      }

      // handle configuration options
      if (product.configurableOptions && product.configurableOptions.length) {
        if (!values.configurableOptions || values.configurableOptions.length !== product.configurableOptions.length) {
          errors.configurableOptions = translations.error.configurableOptions;
        }
      }

      // todo: handle bundled products

      return errors;
    };
  }

  render() {
    const { product, translations } = this.props;

    return (
      <ProductLayout>
        <Breadcrumbs breadcrumbs={product.breadcrumbs} />

        <ProductForm sku={product.sku} validate={this.createValidator(product)}>
          {({
            addToCartMutation: {
              result: { loading, error }
            },
            formik: { values, errors, setFieldValue, submitCount },
            productConfigurator
          }: any) => (
            <ProductDetailsLayout>
              <Box gridArea={Area.gallery} css={{ maxHeight: '100%' }}>
                <ProductGallery items={product.gallery} />
              </Box>
              <Text fontSize="sm" gridArea={Area.sku}>
                {`${translations.sku}: ${product.sku}`}
              </Text>
              <H1 gridArea={Area.title}>{product.name}</H1>

              <Price mb="sm" fontSize="xl" gridArea={Area.price} value={product.price} />
              <ProductConfigurableOptions
                options={product.configurableOptions}
                error={errors.configurableOptions}
                onChange={(ev: React.ChangeEvent<any>) =>
                  productConfigurator.handleProductConfigurationChange('configurableOption', ev)
                }
              />
              <ProductDescriptionLayout
                my="xs"
                dangerouslySetInnerHTML={{ __html: product.description }}
                gridArea={Area.description}
              />
              <FlexLayout alignItems="center" gridArea={Area.cta} mt="xs">
                <NumberInput
                  mr="sm"
                  min="1"
                  name="qty"
                  disabled={loading}
                  defaultValue={String(values.qty)}
                  onChange={ev => setFieldValue('qty', ev.target.value, !!submitCount)}
                />
                <Button type="submit" height="xl" px="md" disabled={loading}>
                  <Icon
                    src={loading ? 'loader' : 'cart'}
                    stroke="white"
                    fill={loading ? 'white' : 'transparent'}
                    size="md"
                    mr="xs"
                  />
                  {translations.addToCart}
                </Button>
              </FlexLayout>
              <Box gridArea={Area.error}>
                <ErrorMessage name="qty" render={msg => <Text color="error">{msg}</Text>} />
                {!!error && <Text color="error">{error.message}</Text>}
              </Box>
            </ProductDetailsLayout>
          )}
        </ProductForm>
      </ProductLayout>
    );
  }
}
