/**
 * Business API Service
 * Organization settings, Analytics, Event management, Albums, Email services
 */
import { apiFetch } from './client';
import { EventConfig, Organization, OrganizationMember, Template, TransactionSummary, AlbumTransaction, CreateTransactionRequest, EmailStatus, BoothPhoto, Album, AlbumPhoto, EventAlbumStats, PaymentRequest } from './types';

// ==================== Organization & Booths ====================

export async function getUserBooths(): Promise<EventConfig[]> {
    const response = await apiFetch('/booths/', { credentials: 'include' });

    if (response.status === 401) {
        // Let the existing auth logic handle logout if needed, or throw
        return [];
    }

    if (!response.ok) {
        console.error(`Failed to load booths: ${response.statusText}`);
        return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

export async function createBooth(boothData: {
    slug: string;
    title: string;
    description?: string;
    theme?: any;
    templates?: Template[];
    settings?: any;
}): Promise<EventConfig> {
    const response = await apiFetch('/booths/', {
        method: 'POST',
        body: JSON.stringify(boothData),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create booth' }));
        throw new Error(error.detail || 'Failed to create booth');
    }

    return await response.json();
}

export async function getUserOrganizations(): Promise<Organization[]> {
    const response = await apiFetch('/organizations/me');
    if (!response.ok) return [];
    return response.json();
}

export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
    const response = await apiFetch(`/organizations/${orgId}/members`);
    if (!response.ok) return [];
    return response.json();
}

export async function inviteMember(orgId: string, email: string, role: string): Promise<void> {
    const response = await apiFetch(`/organizations/${orgId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role })
    });
    if (!response.ok) throw new Error('Failed to invite member');
}

// ==================== Email API ====================

export async function getEmailStatus(): Promise<EmailStatus> {
    const response = await apiFetch('/email/status');
    if (!response.ok) {
        return { configured: false, message: 'Email service unavailable' };
    }
    return response.json();
}

export async function sendPhotoEmail(
    toEmail: string,
    photoUrl: string,
    shareUrl: string,
    eventName?: string,
    brandName?: string,
    primaryColor?: string
): Promise<{ success: boolean; message: string }> {
    const response = await apiFetch('/email/send/photo', {
        method: 'POST',
        body: JSON.stringify({
            to_email: toEmail,
            photo_url: photoUrl,
            share_url: shareUrl,
            event_name: eventName,
            brand_name: brandName,
            primary_color: primaryColor,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to send email' }));
        throw new Error(error.detail || 'Failed to send email');
    }
    return response.json();
}

export async function sendAlbumEmail(
    toEmail: string,
    albumUrl: string,
    eventName: string,
    visitorName?: string,
    brandName?: string,
    primaryColor?: string,
    photosCount?: number,
    eventLogoUrl?: string
): Promise<{ success: boolean; message: string }> {
    const response = await apiFetch('/email/send/album', {
        method: 'POST',
        body: JSON.stringify({
            to_email: toEmail,
            album_url: albumUrl,
            event_name: eventName,
            visitor_name: visitorName,
            brand_name: brandName,
            primary_color: primaryColor,
            photos_count: photosCount,
            event_logo_url: eventLogoUrl,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to send email' }));
        throw new Error(error.detail || 'Failed to send email');
    }
    return response.json();
}

export async function sendAlbumEmailByCode(
    albumCode: string,
    eventName: string,
    baseUrl: string,
    brandName?: string,
    primaryColor?: string
): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams({
        event_name: eventName,
        base_url: baseUrl,
    });
    if (brandName) params.append('brand_name', brandName);
    if (primaryColor) params.append('primary_color', primaryColor);

    const response = await apiFetch(`/email/send/album/${albumCode}?${params}`, {
        method: 'POST',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to send email' }));
        throw new Error(error.detail || 'Failed to send email');
    }
    return response.json();
}

export async function sendBulkAlbumEmails(
    eventId: number,
    baseUrl: string,
    brandName?: string,
    primaryColor?: string
): Promise<{ sent: number; failed: number; skipped: number; message: string }> {
    const response = await apiFetch('/email/send/bulk-albums', {
        method: 'POST',
        body: JSON.stringify({
            event_id: eventId,
            base_url: baseUrl,
            brand_name: brandName,
            primary_color: primaryColor,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to send emails' }));
        throw new Error(error.detail || 'Failed to send emails');
    }
    return response.json();
}

export async function sendTestEmail(toEmail: string): Promise<{ success: boolean; message: string }> {
    const response = await apiFetch(`/email/test?to_email=${encodeURIComponent(toEmail)}`, {
        method: 'POST',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Email test failed' }));
        throw new Error(error.detail || 'Email test failed');
    }
    return response.json();
}

// ==================== Transactions (POS) ====================

export async function createTransaction(
    eventId: number,
    data: CreateTransactionRequest
): Promise<{ success: boolean; transaction: AlbumTransaction }> {
    const response = await apiFetch(`/v2/events/${eventId}/transactions`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create transaction' }));
        throw new Error(error.error || 'Failed to create transaction');
    }
    return response.json();
}

export async function getEventTransactions(
    eventId: number,
    filters?: { status?: string; from?: string; to?: string }
): Promise<{ transactions: AlbumTransaction[] }> {
    let path = `/v2/events/${eventId}/transactions`;
    if (filters) {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (params.toString()) path += `?${params}`;
    }

    const response = await apiFetch(path);

    if (!response.ok) {
        throw new Error('Failed to fetch transactions');
    }
    return response.json();
}

export async function getTransactionSummary(eventId: number): Promise<TransactionSummary> {
    const response = await apiFetch(`/v2/events/${eventId}/transactions/summary`);

    if (!response.ok) {
        throw new Error('Failed to fetch transaction summary');
    }
    return response.json();
}

export async function getTransaction(transactionId: string): Promise<AlbumTransaction> {
    const response = await apiFetch(`/v2/transactions/${transactionId}`);

    if (!response.ok) {
        throw new Error('Failed to fetch transaction');
    }
    return response.json();
}

// ==================== Photos & Visibility ====================

export async function updateBoothPhotoVisibility(shareCode: string, published: boolean): Promise<{ success: boolean }> {
    const response = await apiFetch(`/photos/${shareCode}/visibility`, {
        method: 'PUT',
        body: JSON.stringify({ published }),
    });

    if (!response.ok) {
        throw new Error('Failed to update photo visibility');
    }
    return response.json();
}

export async function updateCreationAdultStatus(id: number, isAdult: boolean): Promise<void> {
    const response = await apiFetch(`/creations/${id}/adult`, {
        method: 'PUT',
        body: JSON.stringify({ is_adult: isAdult }),
    });

    if (!response.ok) {
        throw new Error('Failed to update adult status');
    }
}

export async function updatePhotoAdultStatus(photoId: string, isAdult: boolean): Promise<void> {
    const response = await apiFetch(`/photos/${photoId}/adult`, {
        method: 'PUT',
        body: JSON.stringify({ is_adult: isAdult }),
    });

    if (!response.ok) {
        throw new Error('Failed to update photo adult status');
    }
}

export async function getBoothPhotos(eventId: number | string, filters?: { published?: boolean }): Promise<BoothPhoto[]> {
    let url = `/events/${eventId}/photos`;
    if (filters?.published !== undefined) {
        url += `?published=${filters.published}`;
    }
    const response = await apiFetch(url);
    if (!response.ok) return [];
    return response.json();
}

// ==================== Events ====================

/**
 * Create new event
 */
export async function createEvent(eventData: {
    slug: string;
    title: string;
    description?: string;
    theme?: any;
    templates?: Template[];
    branding?: any;
    settings?: any;
    is_active?: boolean;
}): Promise<EventConfig> {
    const response = await apiFetch('/events/', {
        method: 'POST',
        body: JSON.stringify(eventData),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create event' }));
        throw new Error(error.detail || 'Failed to create event');
    }

    return response.json();
}

/**
 * Get all events for current user
 */
export async function getUserEvents(): Promise<EventConfig[]> {
    const response = await apiFetch('/events/', { credentials: 'include' });

    if (response.status === 401) {
        // Let caller handle auth
        return [];
    }

    if (!response.ok) {
        console.error(`Failed to load events: ${response.statusText}`);
        return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

/**
 * Update event
 */
export async function updateEvent(eventId: string, eventData: Partial<EventConfig>): Promise<EventConfig> {
    const response = await apiFetch(`/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to update event' }));
        throw new Error(error.detail || 'Failed to update event');
    }

    return await response.json();
}

/**
 * Delete event
 */
export async function deleteEvent(eventId: string): Promise<void> {
    const response = await apiFetch(`/events/${eventId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete event' }));
        throw new Error(error.detail || 'Failed to delete event');
    }
}

/**
 * Upload photo to event
 */
export async function uploadPhotoToEvent(
    eventId: number,
    originalImageBase64: string,
    processedImageBase64: string,
    backgroundId?: string,
    backgroundName?: string,
    prompt?: string,
    meta?: any
): Promise<{ id: string; processedImageUrl: string; shareCode: string; createdAt: number }> {
    const response = await apiFetch('/photos/upload', {
        method: 'POST',
        body: JSON.stringify({
            event_id: eventId,
            original_image_base64: originalImageBase64,
            processed_image_base64: processedImageBase64,
            background_id: backgroundId,
            background_name: backgroundName,
            prompt,
            meta,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || 'Failed to upload photo');
    }

    return await response.json();
}

/**
 * Get user token statistics
 */
export async function getTokenStats(): Promise<{ current_tokens: number; tokens_total?: number; plan_tokens?: number }> {
    const response = await apiFetch('/tokens/stats');

    if (!response.ok) {
        throw new Error('Failed to fetch token stats');
    }

    return response.json();
}

// ==================== Album Types ====================



// ==================== Albums ====================

export async function createAlbum(eventId: number, orgId?: string, ownerName?: string, ownerEmail?: string): Promise<Album> {
    const response = await apiFetch('/albums', {
        method: 'POST',
        useV2: true,
        body: JSON.stringify({
            event_id: eventId,
            organization_id: orgId,
            owner_name: ownerName,
            owner_email: ownerEmail
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create album' }));
        throw new Error(error.detail || 'Failed to create album');
    }
    return response.json();
}

export async function getAlbum(code: string): Promise<Album> {
    const response = await apiFetch(`/albums/${code}`, { useV2: true });
    if (!response.ok) throw new Error('Album not found');
    return response.json();
}

export async function getAlbumPhotos(code: string): Promise<AlbumPhoto[]> {
    const response = await apiFetch(`/albums/${code}/photos`, { useV2: true });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

export async function addAlbumPhoto(code: string, photoId: string, stationType: string): Promise<AlbumPhoto> {
    const response = await apiFetch(`/albums/${code}/photos`, {
        method: 'POST',
        useV2: true,
        body: JSON.stringify({ photo_id: photoId, station_type: stationType })
    });

    if (!response.ok) throw new Error('Failed to add photo to album');
    return response.json();
}

export async function deleteAlbumPhoto(albumCode: string, photoId: string, staffPin?: string): Promise<void> {
    let url = `/albums/${albumCode}/photos/${photoId}`;
    if (staffPin) {
        url += `?pin=${encodeURIComponent(staffPin)}`;
    }

    const response = await apiFetch(url, {
        method: 'DELETE',
        useV2: true
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete photo' }));
        throw new Error(error.detail || 'Failed to delete photo');
    }
}

export async function deleteAlbum(albumCode: string, staffPin?: string): Promise<{ photosDeleted: number }> {
    let url = `/albums/${albumCode}`;
    if (staffPin) {
        url += `?pin=${encodeURIComponent(staffPin)}`;
    }

    const response = await apiFetch(url, {
        method: 'DELETE',
        useV2: true
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete album' }));
        throw new Error(error.detail || 'Failed to delete album');
    }

    const result = await response.json();
    return { photosDeleted: result.photos_deleted || 0 };
}

/**
 * Track album download event
 */
export async function trackAlbumDownload(
    albumCode: string,
    photoCount: number,
    downloadType: 'zip' | 'single' | 'print'
): Promise<void> {
    try {
        await apiFetch(`/albums/${albumCode}/track-download`, {
            method: 'POST',
            body: JSON.stringify({
                photo_count: photoCount,
                download_type: downloadType
            })
        });
        // Fire and forget - don't block on analytics
    } catch (error) {
        console.warn('Failed to track download:', error);
    }
}

export async function getEventAlbums(eventId: number): Promise<Album[]> {
    const response = await apiFetch(`/albums/event/${eventId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

/**
 * Get event albums using staff PIN (no auth required)
 * Used by Staff Dashboard when accessed via direct link
 */
export async function getEventAlbumsWithPin(eventId: number, pin: string): Promise<Album[]> {
    const response = await apiFetch(`/albums/event/${eventId}/staff?pin=${encodeURIComponent(pin)}`);
    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('Invalid staff PIN');
        }
        return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

export async function getEventAlbumStats(eventId: number): Promise<EventAlbumStats> {
    const response = await apiFetch(`/albums/event/${eventId}/stats`);
    if (!response.ok) {
        return {
            totalAlbums: 0,
            completedAlbums: 0,
            inProgressAlbums: 0,
            paidAlbums: 0,
            totalPhotos: 0,
            pendingApproval: 0
        };
    }
    return response.json();
}

export async function updateAlbumStatus(albumCode: string, status: 'in_progress' | 'completed' | 'paid' | 'archived'): Promise<void> {
    const response = await apiFetch(`/albums/${albumCode}/status?status=${status}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Failed to update album status');
}

export async function createAlbumCheckout(albumCode: string): Promise<{ checkout_url: string }> {
    const response = await apiFetch(`/billing/albums/${albumCode}/checkout/`, {
        method: 'POST'
    });

    if (!response.ok) throw new Error('Failed to create checkout');
    return response.json();
}

export async function requestAlbumPayment(albumCode: string): Promise<{ status: string; message: string }> {
    const response = await apiFetch(`/albums/${albumCode}/request-payment`, {
        method: 'POST'
    });

    if (!response.ok) throw new Error('Failed to request payment');
    return response.json();
}

export async function requestBigScreen(albumCode: string): Promise<{ status: string; message: string }> {
    const response = await apiFetch(`/albums/${albumCode}/request-bigscreen`, {
        method: 'POST'
    });

    if (!response.ok) throw new Error('Failed to request big screen');
    return response.json();
}

export async function getPaymentRequests(eventId: number): Promise<PaymentRequest[]> {
    const response = await apiFetch(`/albums/event/${eventId}/payment-requests/`);

    if (!response.ok) return [];
    return response.json();
}
