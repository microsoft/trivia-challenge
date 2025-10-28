FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# Install .NET 10 SDK
RUN wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh \
    && chmod +x dotnet-install.sh \
    && ./dotnet-install.sh --channel 10.0 --install-dir /usr/share/dotnet \
    && rm dotnet-install.sh

# Add .NET to PATH
ENV PATH="${PATH}:/usr/share/dotnet"

# Install additional tools
RUN npm install -g @azure/static-web-apps-cli

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
