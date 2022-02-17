export interface Branch {
	name: string;
	merged: boolean;
	protected: boolean;
	default: boolean;
	developers_can_push: boolean;
	developers_can_merge: boolean;
	can_push: boolean;
	web_url: string;
}