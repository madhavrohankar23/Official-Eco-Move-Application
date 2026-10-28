import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Check, Save } from "lucide-react-native";
import { useApp } from "../../AppContext";
import { Action, Copy, Field, Glass, Notice } from "../../components/Glass";
import type { CommuterProfileData } from "./commuterTypes";
import { NAGPUR_COMMUTE_HUBS } from "./commuteHubs";

const fields = [
  ["occupation", "Occupation"],
  ["commuteDistance", "Daily commute distance"],
  ["vehicleOwned", "Vehicle owned"],
  ["vehicleModelYear", "Vehicle model / year"],
  ["dailyTravelTime", "Daily travel time"],
  ["commutePriority", "Commute priority"],
  ["monthlyExpense", "Monthly travel expense"],
] as const;

export function CommuterProfileScreen() {
  const { rpc, auth, back } = useApp();
  const [profile, setProfile] = useState<CommuterProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    let current = true;
    active.current = true;
    setLoading(true);
    void rpc<CommuterProfileData | null>("commuter")
      .then((data) => {
        if (current) setProfile(data || {});
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      active.current = false;
    };
  }, [rpc, auth.user?.id]);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const value = await rpc<CommuterProfileData>("saveCommuter", { profile });
      if (active.current) {
        setProfile(value);
        setMessage(
          value.syncStatus === "cloud"
            ? "Commute details saved to your account."
            : "Saved on this device. Cloud sync was unavailable or this is a demo account.",
        );
      }
    } catch (e) {
      if (active.current)
        setError(e instanceof Error ? e.message : "Could not save commute details.");
    } finally {
      if (active.current) setSaving(false);
    }
  };
  return (
    <>
      <Notice>
        Optional commute details. These answers do not change your route settings or appearance.
      </Notice>
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}
      {loading ? (
        <Copy muted>Loading commute details…</Copy>
      ) : (
        <>
          {fields.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={profile[key] || ""}
              editable={!saving}
              maxLength={120}
              onChangeText={(value) => setProfile((p) => ({ ...p, [key]: value }))}
            />
          ))}
          <Copy weight="600">Transit frequency</Copy>
          {(["metro", "bus", "auto"] as const).map((mode) => (
            <Field
              key={mode}
              label={`${mode[0].toUpperCase()}${mode.slice(1)} usage`}
              value={profile.transitFrequency?.[mode] || ""}
              editable={!saving}
              maxLength={80}
              onChangeText={(value) =>
                setProfile((p) => ({
                  ...p,
                  transitFrequency: { ...p.transitFrequency, [mode]: value },
                }))
              }
            />
          ))}
          <Glass level={1} blur={false}>
            <View style={{ padding: 16, gap: 10 }}>
              <Copy weight="600">Frequent hubs</Copy>
              {NAGPUR_COMMUTE_HUBS.map((hub) => (
                <Action
                  key={hub.id}
                  label={hub.name}
                  icon={Check}
                  quiet
                  compact
                  selected={profile.frequentHubs?.includes(hub.id)}
                  disabled={saving}
                  onPress={() =>
                    setProfile((p) => ({
                      ...p,
                      frequentHubs: p.frequentHubs?.includes(hub.id)
                        ? p.frequentHubs.filter((id) => id !== hub.id)
                        : [...(p.frequentHubs || []), hub.id],
                    }))
                  }
                />
              ))}
            </View>
          </Glass>
          <Action
            label="Save commute details"
            icon={Save}
            selected
            loading={saving}
            onPress={() => void save()}
          />
        </>
      )}
      <Action label="Back to profile" quiet onPress={back} />
    </>
  );
}
