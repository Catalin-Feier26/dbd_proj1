FROM postgres:16

RUN apt-get update && apt-get install -y \
    python3 python3-pip bash \
    && rm -rf /var/lib/apt/lists/*

COPY scripts /scripts
COPY preprocessing /scripts/preprocessing
RUN chmod +x /scripts/run_etl.sh

WORKDIR /scripts

CMD ["tail", "-f", "/dev/null"]
