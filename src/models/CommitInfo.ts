export interface CommitInfo {
	id: string;
	short_id: string;
	title: string;
	author_name: string;
	author_email: string;
	authored_date: string;
	committer_name: string;
	committer_email: string;
	committed_date: string;
	created_at: string;
	message: string;
	parent_ids: string[];
	web_url: string;
}