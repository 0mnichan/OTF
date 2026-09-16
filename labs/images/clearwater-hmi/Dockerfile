FROM python:3.11-slim
RUN pip install --no-cache-dir "pymodbus==3.6.9" && useradd -r -u 10002 hmi
WORKDIR /app
COPY hmi.py /app/hmi.py
ENV OTF_PLC_HOST=plc.lab PORT=8080
USER hmi
EXPOSE 8080
CMD ["python3", "/app/hmi.py"]
