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
];

export const SEED_DRIVERS = [
  {
    id: 'driver-mmgsc6vz-o0vuu',
    name: 'Tim Smith',
    email: 'suncollectives@icloud.com',
    phone: '6189748695',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'driver-mmgsb276-y3hj3',
    name: 'Bruce Edgerton',
    email: 'Bruce.Edgerton@yahoo.com',
    phone: '7155090114',
    role: 'admin',
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
