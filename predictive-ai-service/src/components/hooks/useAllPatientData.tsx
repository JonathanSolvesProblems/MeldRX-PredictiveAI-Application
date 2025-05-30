import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/app/redux/store";
import { ResourceType, UseAllPatientDataOptions } from "@/utils/types";
import { setConditions } from "@/app/redux/patientDataSlicers/conditionSlice";
import { setObservations } from "@/app/redux/patientDataSlicers/observationsSlice";
import { setDocuments } from "@/app/redux/patientDataSlicers/documentSlice";
import { setAllergies } from "@/app/redux/patientDataSlicers/allergySlice";
import { setCarePlans } from "@/app/redux/patientDataSlicers/carePlanSlice";
import { setCareTeams } from "@/app/redux/patientDataSlicers/careTeamSlice";
import { setDevices } from "@/app/redux/patientDataSlicers/deviceSlice";
import { setDiagnosticReports } from "@/app/redux/patientDataSlicers/diagnosticReportSlice";
import { setEncounters } from "@/app/redux/patientDataSlicers/encounterSlice";
import { setGoals } from "@/app/redux/patientDataSlicers/goalSlice";
import { setImmunizations } from "@/app/redux/patientDataSlicers/immunizationSlice";
import { setMedicationStatements } from "@/app/redux/patientDataSlicers/medicationStatementSlice";
import { setProcedures } from "@/app/redux/patientDataSlicers/procedureSlice";
import { setProvenances } from "@/app/redux/patientDataSlicers/provenanceSlice";
import { fetchFHIRResource } from "@/utils/fhirAPICalls";

export const useAllPatientData = (options: UseAllPatientDataOptions = {}) => {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const patientId = useSelector((state: RootState) => state.auth.patientId);

  const state = useSelector((state: RootState) => state);

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    conditions,
    observations,
    documents,
    allergies,
    carePlans,
    careTeams,
    devices,
    diagnosticReports,
    encounters,
    goals,
    immunizations,
    medicationStatements,
    procedures,
    provenances,
  } = state;

  const allResources = {
    Condition: conditions.conditions,
    Observation: observations.observations,
    DocumentReference: documents.documents,
    AllergyIntolerance: allergies.allergies,
    CarePlan: carePlans.carePlans,
    CareTeam: careTeams.careTeams,
    Device: devices.devices,
    DiagnosticReport: diagnosticReports.diagnosticReports,
    Encounter: encounters.encounters,
    Goal: goals.goals,
    Immunization: immunizations.immunizations,
    MedicationStatement: medicationStatements.medicationStatements,
    Procedure: procedures.procedures,
    Provenance: provenances.provenances,
  };

  const resourceMap: Record<ResourceType, any> = {
    Condition: setConditions,
    Observation: setObservations,
    DocumentReference: setDocuments,
    AllergyIntolerance: setAllergies,
    CarePlan: setCarePlans,
    CareTeam: setCareTeams,
    Device: setDevices,
    DiagnosticReport: setDiagnosticReports,
    Encounter: setEncounters,
    Goal: setGoals,
    Immunization: setImmunizations,
    MedicationStatement: setMedicationStatements,
    Procedure: setProcedures,
    Provenance: setProvenances,
  };

  const fetchAllResources = async () => {
    if (!token || !patientId) return;
    setLoading(true);
    setErrors({});

    const resourceFetchers = (["DocumentReference"] as ResourceType[]).map(
      // const resourceFetchers = (Object.keys(resourceMap) as ResourceType[]).map( // With MCP, I only need to fetch DocumentReference for now
      async (resourceType) => {
        const config = options.resourceConfigs?.[resourceType];
        try {
          const existingData = allResources[resourceType];
          if (!existingData || existingData.length === 0) {
            await fetchFHIRResource({
              resourceType,
              token,
              patientId,
              dispatch,
              setResourceAction: resourceMap[resourceType],
              maxItems: config?.maxItems,
              onFetched: config?.onFetched,
            });
          }
        } catch (err: any) {
          setErrors((prev) => ({
            ...prev,
            [resourceType]: err.message || "Error",
          }));
        }
      }
    );

    await Promise.all(resourceFetchers);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllResources();
  }, [token, patientId]);

  const refreshAllResources = fetchAllResources;

  const totalCount = Object.values(allResources).reduce(
    (sum, list: any[]) => sum + (list?.length || 0),
    0
  );

  return {
    allResources,
    totalCount,
    loading,
    errors,
    refreshAllResources,
  };
};
