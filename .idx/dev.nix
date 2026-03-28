{ pkgs, ... }: {
  # See https://developers.google.com/idx/guides/customize-idx-env
  channel = "unstable"; 

  packages = [
    pkgs.nodejs_22
  ];

  env = {};

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
    ];

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Example: "npm-install" = "npm ci --no-audit --prefer-offline --no-progress --timing";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Example: "start-server" = "npm run dev";
      };
    };

    # Enable previews
    previews = {
      enable = true;
      previews = {
        web = {
          # This command starts your server
          command = ["npm" "run" "dev"];
          manager = "web";
          env = {
            # Environment variables for the preview
            PORT = "$PORT";
          };
        };
      };
    };
    
  };
}