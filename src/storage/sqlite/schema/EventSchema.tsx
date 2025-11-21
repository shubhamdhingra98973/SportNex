export interface EventSchema {
    id?: string;
    eventTitle: string;
    eventDescription: string;
    eventLocation: string;
    maxPlayerLimit: number;
    eventDateTime: number; // Unix timestamp
    createdDate: number; // Unix timestamp
    hostedBy: {
        id: string;
        name: string;
    };
    participants: Array<{
        id: string;
        name: string;
        status: 'confirmed' | 'pending' | 'rejected' | 'expired';
    }>;
}
