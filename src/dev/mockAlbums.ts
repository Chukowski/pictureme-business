/**
 * Mock Albums Data
 * 
 * Used for testing the Staff Dashboard and Album Feed without real data.
 * Enable by adding ?mock=1 to the URL.
 */

export interface MockAlbumPhoto {
  id: string;
  url: string;
  thumbnail_url: string;
  created_at: string;
  station_id: string;
}

export interface MockAlbum {
  id: string;
  code: string;
  event_id: number;
  owner_name: string;
  owner_email?: string;
  status: 'in_progress' | 'completed' | 'pending_approval' | 'approved' | 'rejected';
  payment_status: 'unpaid' | 'paid' | 'free';
  photos: MockAlbumPhoto[];
  created_at: string;
  updated_at: string;
  assigned_station: string;
  max_photos: number;
}

// Generate random timestamps within the last 24 hours
const randomRecentTime = () => {
  const now = Date.now();
  const hoursAgo = Math.random() * 24;
  return new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();
};

// Placeholder image URLs (using picsum.photos for variety)
const generatePhotoUrl = (id: number) => `https://picsum.photos/seed/${id}/800/600`;
const generateThumbnailUrl = (id: number) => `https://picsum.photos/seed/${id}/200/150`;

export const mockAlbums: MockAlbum[] = [
  {
    id: 'album-001',
    code: 'ABC123',
    event_id: 1,
    owner_name: 'John Smith',
    owner_email: 'john@example.com',
    status: 'completed',
    payment_status: 'paid',
    photos: [
      { id: 'p1', url: generatePhotoUrl(101), thumbnail_url: generateThumbnailUrl(101), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p2', url: generatePhotoUrl(102), thumbnail_url: generateThumbnailUrl(102), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p3', url: generatePhotoUrl(103), thumbnail_url: generateThumbnailUrl(103), created_at: randomRecentTime(), station_id: 'playground' },
      { id: 'p4', url: generatePhotoUrl(104), thumbnail_url: generateThumbnailUrl(104), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p5', url: generatePhotoUrl(105), thumbnail_url: generateThumbnailUrl(105), created_at: randomRecentTime(), station_id: 'booth' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'booth',
    max_photos: 5,
  },
  {
    id: 'album-002',
    code: 'DEF456',
    event_id: 1,
    owner_name: 'Sarah Johnson',
    owner_email: 'sarah@example.com',
    status: 'in_progress',
    payment_status: 'unpaid',
    photos: [
      { id: 'p6', url: generatePhotoUrl(201), thumbnail_url: generateThumbnailUrl(201), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p7', url: generatePhotoUrl(202), thumbnail_url: generateThumbnailUrl(202), created_at: randomRecentTime(), station_id: 'booth' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'booth',
    max_photos: 5,
  },
  {
    id: 'album-003',
    code: 'GHI789',
    event_id: 1,
    owner_name: 'Mike Williams',
    status: 'pending_approval',
    payment_status: 'unpaid',
    photos: [
      { id: 'p8', url: generatePhotoUrl(301), thumbnail_url: generateThumbnailUrl(301), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p9', url: generatePhotoUrl(302), thumbnail_url: generateThumbnailUrl(302), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p10', url: generatePhotoUrl(303), thumbnail_url: generateThumbnailUrl(303), created_at: randomRecentTime(), station_id: 'playground' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'playground',
    max_photos: 5,
  },
  {
    id: 'album-004',
    code: 'JKL012',
    event_id: 1,
    owner_name: 'Emily Davis',
    owner_email: 'emily@example.com',
    status: 'approved',
    payment_status: 'paid',
    photos: [
      { id: 'p11', url: generatePhotoUrl(401), thumbnail_url: generateThumbnailUrl(401), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p12', url: generatePhotoUrl(402), thumbnail_url: generateThumbnailUrl(402), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p13', url: generatePhotoUrl(403), thumbnail_url: generateThumbnailUrl(403), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p14', url: generatePhotoUrl(404), thumbnail_url: generateThumbnailUrl(404), created_at: randomRecentTime(), station_id: 'booth' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'booth',
    max_photos: 5,
  },
  {
    id: 'album-005',
    code: 'MNO345',
    event_id: 1,
    owner_name: 'David Brown',
    status: 'completed',
    payment_status: 'free',
    photos: [
      { id: 'p15', url: generatePhotoUrl(501), thumbnail_url: generateThumbnailUrl(501), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p16', url: generatePhotoUrl(502), thumbnail_url: generateThumbnailUrl(502), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p17', url: generatePhotoUrl(503), thumbnail_url: generateThumbnailUrl(503), created_at: randomRecentTime(), station_id: 'booth' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'booth',
    max_photos: 5,
  },
  {
    id: 'album-006',
    code: 'PQR678',
    event_id: 1,
    owner_name: 'Lisa Anderson',
    owner_email: 'lisa@example.com',
    status: 'in_progress',
    payment_status: 'unpaid',
    photos: [
      { id: 'p18', url: generatePhotoUrl(601), thumbnail_url: generateThumbnailUrl(601), created_at: randomRecentTime(), station_id: 'booth' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'booth',
    max_photos: 5,
  },
  {
    id: 'album-007',
    code: 'STU901',
    event_id: 1,
    owner_name: 'James Wilson',
    status: 'rejected',
    payment_status: 'unpaid',
    photos: [
      { id: 'p19', url: generatePhotoUrl(701), thumbnail_url: generateThumbnailUrl(701), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p20', url: generatePhotoUrl(702), thumbnail_url: generateThumbnailUrl(702), created_at: randomRecentTime(), station_id: 'booth' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'booth',
    max_photos: 5,
  },
  {
    id: 'album-008',
    code: 'VWX234',
    event_id: 1,
    owner_name: 'Jennifer Taylor',
    owner_email: 'jennifer@example.com',
    status: 'pending_approval',
    payment_status: 'unpaid',
    photos: [
      { id: 'p21', url: generatePhotoUrl(801), thumbnail_url: generateThumbnailUrl(801), created_at: randomRecentTime(), station_id: 'playground' },
      { id: 'p22', url: generatePhotoUrl(802), thumbnail_url: generateThumbnailUrl(802), created_at: randomRecentTime(), station_id: 'playground' },
      { id: 'p23', url: generatePhotoUrl(803), thumbnail_url: generateThumbnailUrl(803), created_at: randomRecentTime(), station_id: 'playground' },
      { id: 'p24', url: generatePhotoUrl(804), thumbnail_url: generateThumbnailUrl(804), created_at: randomRecentTime(), station_id: 'playground' },
      { id: 'p25', url: generatePhotoUrl(805), thumbnail_url: generateThumbnailUrl(805), created_at: randomRecentTime(), station_id: 'playground' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'playground',
    max_photos: 5,
  },
  {
    id: 'album-009',
    code: 'YZA567',
    event_id: 1,
    owner_name: 'Robert Martinez',
    status: 'completed',
    payment_status: 'paid',
    photos: [
      { id: 'p26', url: generatePhotoUrl(901), thumbnail_url: generateThumbnailUrl(901), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p27', url: generatePhotoUrl(902), thumbnail_url: generateThumbnailUrl(902), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p28', url: generatePhotoUrl(903), thumbnail_url: generateThumbnailUrl(903), created_at: randomRecentTime(), station_id: 'booth' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'booth',
    max_photos: 5,
  },
  {
    id: 'album-010',
    code: 'BCD890',
    event_id: 1,
    owner_name: 'Amanda Garcia',
    owner_email: 'amanda@example.com',
    status: 'in_progress',
    payment_status: 'unpaid',
    photos: [
      { id: 'p29', url: generatePhotoUrl(1001), thumbnail_url: generateThumbnailUrl(1001), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p30', url: generatePhotoUrl(1002), thumbnail_url: generateThumbnailUrl(1002), created_at: randomRecentTime(), station_id: 'booth' },
      { id: 'p31', url: generatePhotoUrl(1003), thumbnail_url: generateThumbnailUrl(1003), created_at: randomRecentTime(), station_id: 'playground' },
      { id: 'p32', url: generatePhotoUrl(1004), thumbnail_url: generateThumbnailUrl(1004), created_at: randomRecentTime(), station_id: 'playground' },
    ],
    created_at: randomRecentTime(),
    updated_at: randomRecentTime(),
    assigned_station: 'booth',
    max_photos: 5,
  },
];

/**
 * Check if mock mode is enabled via URL parameter
 */
export function isMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('mock') || params.get('mock') === '1';
}

/**
 * Get mock albums, optionally filtered by status
 */
export function getMockAlbums(status?: string): MockAlbum[] {
  if (status && status !== 'all') {
    return mockAlbums.filter(album => album.status === status);
  }
  return mockAlbums;
}

/**
 * Get a single mock album by code
 */
export function getMockAlbumByCode(code: string): MockAlbum | undefined {
  return mockAlbums.find(album => album.code === code);
}

/**
 * Get album statistics
 */
export function getMockAlbumStats() {
  return {
    total: mockAlbums.length,
    in_progress: mockAlbums.filter(a => a.status === 'in_progress').length,
    completed: mockAlbums.filter(a => a.status === 'completed').length,
    pending_approval: mockAlbums.filter(a => a.status === 'pending_approval').length,
    approved: mockAlbums.filter(a => a.status === 'approved').length,
    rejected: mockAlbums.filter(a => a.status === 'rejected').length,
    total_photos: mockAlbums.reduce((sum, a) => sum + a.photos.length, 0),
    paid: mockAlbums.filter(a => a.payment_status === 'paid').length,
    unpaid: mockAlbums.filter(a => a.payment_status === 'unpaid').length,
  };
}

