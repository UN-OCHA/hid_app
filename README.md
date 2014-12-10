# Humanitarian ID Web App

## Running the App Locally

See RUNNING.md

## Building the App

1. Run `npm install` to download all tool dependencies.

1. Run `grunt` to build the project, which runs `bower install`, `compass compile`, and copies configuration files into place.

## Supporting Multiple Environments

Some app settings are specific to the environment where the app runs. For example, the API key used by this app with the authentication service varies depending on which environment this app is running (local vs. dev vs. prod).

The `src/js` directory includes multiple configuration files named `config.<env>.js`.

When running `grunt`, you may specify the environment targeted for the build by using the `--target` option. For example, the following command builds the project for the *dev* environment:

```
grunt --target=dev
```
