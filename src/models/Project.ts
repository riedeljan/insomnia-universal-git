export interface Project {
	id: number;
	default_branch: string;
	ssh_url_to_repo: string;
	http_url_to_repo: string;
	web_url: string;
	name: string;
	name_with_namespace: string;
	path: string;
	path_with_namespace: string;
	created_at: string;
	last_activity_at: string;
	forks_count: number;
	avatar_url: string;
	star_count: number;
}