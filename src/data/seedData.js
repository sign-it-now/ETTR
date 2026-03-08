// Seed data for ETTR app
// Used when no data exists in localStorage or GitHub repo

export const SEED_USERS = [
  {
    id: 'user-tim',
    name: 'Tim Smith',
    role: 'admin',
    email: 'tim@ettrfleet.com',
    phone: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-bruce',
    name: 'Bruce Edgerton',
    role: 'admin',
    email: 'bruce@ettrfleet.com',
    phone: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-driver',
    name: 'Test Driver',
    role: 'driver',
    email: '',
    phone: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

export const SEED_DRIVERS = [
  {
    id: 'user-driver',
    name: 'Test Driver',
    email: '',
    phone: '',
    role: 'driver',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

export const SEED_BROKERS = [];

export const SEED_LOADS = [];

export const SEED_INVOICES = [];

// Full seed dataset
export const SEED_DATA = {
  loads: SEED_LOADS,
  drivers: SEED_DRIVERS,
  brokers: SEED_BROKERS,
  invoices: SEED_INVOICES,
  users: SEED_USERS,
};
