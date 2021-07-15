# Universal Git Plugin for Insomnia API Client

This plugin for Insomnia aims to ease syncing your workspaces, directories or even single requests to your Git repositories. Right now GitLab is supported only but GitHub and others will be supported soon.

## Current Features
### GitLab
*   Sync Workspace

## How to use this plugin

Just install it via the [Insomnia Plugin Hub](https://insomnia.rest/plugins).

As I'm currently releasing updates nearly every day and the plugin hub only updates very rarely I'd recommend to install the plugin directly from npm by its name `insomnia-plugin-universal-git` under `Insomnia -> Preferences -> Plugins`.

After installing just hit the dropdown menu located right beneath the workspace/collections name, go through the setup and start pulling/pushing your config.

![Bildschirmfoto 2021-07-15 um 12 02 42](https://user-images.githubusercontent.com/10552010/125770090-77a957b7-51c4-4012-b45d-abbf92672ea4.png)

## Setup

* Base URL: Your GitLabs' URL.
* Access Token: Create an access token with "api" scope.
* Project ID: Create a new project to store your configs directly in GitLab and enter the project id which you find in the settings.
* Workspace File Name: The file your workspace will be stored under (JSON). Choose this freely.

![Bildschirmfoto 2021-07-15 um 12 07 20](https://user-images.githubusercontent.com/10552010/125770678-11605595-13be-472c-a350-a8b09a2a5d6f.png)

## Branches

Multi-Branch support is implemented. You can choose from your existing branches or create new ones in the Setup.
