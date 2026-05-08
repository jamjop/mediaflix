import { Router, type IRouter } from "express";
import * as si from "systeminformation";
import os from "os";
import { GetServerMetricsResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAuth } from "./auth";

const router: IRouter = Router();

const SKIP_FS = new Set(["tmpfs", "devtmpfs", "overlay", "squashfs", "udev", "none", "cgroupfs", "efivarfs"]);

// Persist a baseline between requests for network rate calculation
let lastNet: { rx: number; tx: number; ts: number } | null = null;

router.get("/metrics", requireAuth, async (_req, res): Promise<void> => {
  try {
    const [load, temp, cpuInfo, mem, disks, netStats, graphics] = await Promise.all([
      si.currentLoad(),
      si.cpuTemperature(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.graphics(),
    ]);

    // CPU
    const usagePercent = Math.round((load.currentLoad ?? 0) * 10) / 10;
    const rawTemp = temp.main ?? null;
    const tempCelsius = rawTemp !== null && rawTemp > 0 ? Math.round(rawTemp) : null;

    // Memory — use active (real usage, excluding cache/buffers)
    const totalBytes = mem.total;
    const usedBytes = mem.active;
    const freeBytes = mem.available;
    const memUsagePercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;

    // Disks — skip virtual/pseudo filesystems
    const filteredDisks = disks
      .filter((d) => !SKIP_FS.has(d.type) && d.size > 0)
      .map((d) => ({
        fs: d.fs,
        mount: d.mount,
        size_bytes: d.size,
        used_bytes: d.used,
        use_percent: Math.round((d.use ?? 0) * 10) / 10,
      }));

    // Network — rate calculation against previous sample
    const now = Date.now();
    const totalRx = netStats.reduce((s, n) => s + (n.rx_bytes ?? 0), 0);
    const totalTx = netStats.reduce((s, n) => s + (n.tx_bytes ?? 0), 0);
    let rxRate = 0;
    let txRate = 0;
    if (lastNet) {
      const elapsed = (now - lastNet.ts) / 1000;
      if (elapsed > 0) {
        rxRate = Math.max(0, (totalRx - lastNet.rx) / elapsed);
        txRate = Math.max(0, (totalTx - lastNet.tx) / elapsed);
      }
    }
    lastNet = { rx: totalRx, tx: totalTx, ts: now };
    const primaryIface = netStats.find((n) => n.iface !== "lo")?.iface ?? "eth0";

    // GPUs — filter out headless/dummy entries with no model
    const gpus = (graphics.controllers ?? [])
      .filter((g) => g.model && g.model.trim() !== "")
      .map((g) => {
        const memTotalMb = g.memoryTotal && g.memoryTotal > 0 ? g.memoryTotal : null;
        const memUsedMb = g.memoryUsed && g.memoryUsed > 0 ? g.memoryUsed : null;
        const memPct =
          memTotalMb && memUsedMb ? Math.round((memUsedMb / memTotalMb) * 1000) / 10 : null;
        return {
          vendor: g.vendor || "Unknown",
          model: g.model,
          vram_mb: g.vram && g.vram > 0 ? g.vram : null,
          temp_celsius: g.temperatureGpu && g.temperatureGpu > 0 ? Math.round(g.temperatureGpu) : null,
          usage_percent: g.utilizationGpu != null && g.utilizationGpu >= 0 ? Math.round(g.utilizationGpu * 10) / 10 : null,
          memory_used_mb: memUsedMb,
          memory_total_mb: memTotalMb,
          memory_usage_percent: memPct,
        };
      });

    const result = GetServerMetricsResponse.parse({
      cpu: {
        usage_percent: usagePercent,
        temp_celsius: tempCelsius,
        cores: cpuInfo.physicalCores || cpuInfo.cores || os.cpus().length,
        brand: cpuInfo.brand || os.cpus()[0]?.model || "Unknown CPU",
        load_1m: Math.round(os.loadavg()[0] * 100) / 100,
        load_5m: Math.round(os.loadavg()[1] * 100) / 100,
        load_15m: Math.round(os.loadavg()[2] * 100) / 100,
      },
      memory: {
        total_bytes: totalBytes,
        used_bytes: usedBytes,
        free_bytes: freeBytes,
        usage_percent: memUsagePercent,
      },
      disks: filteredDisks,
      network: {
        rx_bytes_per_sec: Math.round(rxRate),
        tx_bytes_per_sec: Math.round(txRate),
        iface: primaryIface,
      },
      uptime_seconds: Math.floor(os.uptime()),
      gpus,
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to fetch server metrics");
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
