import type { CollectionConfig } from 'payload';

/**
 * Tools — the machinery fleet shown on /tools.
 *
 * Kept as a collection so Tom can add/retire items as the fleet changes
 * without editing a monolithic page.
 */
export const Tools: CollectionConfig = {
  slug: 'tools',
  labels: { singular: 'Tool', plural: 'Tools' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'manufacturer', 'active'],
    description: 'Machinery and equipment in the fleet.',
  },
  access: { read: () => true },
  defaultSort: 'orderInList',
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Tractor', value: 'tractor' },
        { label: 'Topper / Mower', value: 'topper' },
        { label: 'Flail', value: 'flail' },
        { label: 'Harrow', value: 'harrow' },
        { label: 'Roller', value: 'roller' },
        { label: 'Seeder / Overseeder', value: 'seeder' },
        { label: 'Rotavator', value: 'rotavator' },
        { label: 'Plough', value: 'plough' },
        { label: 'Aerator', value: 'aerator' },
        { label: 'Sprayer', value: 'sprayer' },
        { label: 'Sweeper', value: 'sweeper' },
        { label: 'Hedge cutter', value: 'hedge-cutter' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'manufacturer', type: 'text' },
    { name: 'model', type: 'text' },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'specs',
      type: 'array',
      admin: { description: 'Key specifications shown as a list.' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    },
    { name: 'description', type: 'richText' },
    {
      name: 'usedForServices',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Uncheck to retire without deleting.' },
    },
    {
      name: 'orderInList',
      type: 'number',
      defaultValue: 100,
      admin: { position: 'sidebar' },
    },
  ],
};
