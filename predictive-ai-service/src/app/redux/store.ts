import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import conditionsReducer from "./patientDataSlicers/conditionSlice"; 
import observationsReducer from "./patientDataSlicers/observationsSlice";
import documentsReducer from './patientDataSlicers/documentSlice';
import analysisReducer from "./analysisSlice";
import allergiesReducer from './patientDataSlicers/allergySlice';
import carePlansReducer from './patientDataSlicers/carePlanSlice';
import careTeamsReducer from './patientDataSlicers/careTeamSlice';
import devicesReducer from './patientDataSlicers/deviceSlice';
import diagnosticReportsReducer from './patientDataSlicers/diagnosticReportSlice';
import encountersReducer from './patientDataSlicers/encounterSlice';
import goalsReducer from './patientDataSlicers/goalSlice';
import immunizationsReducer from './patientDataSlicers/immunizationSlice';
import locationsReducer from './patientDataSlicers/locationSlice';
import medicationStatementsReducer from './patientDataSlicers/medicationStatementSlice';
import organizationsReducer from './patientDataSlicers/organizationSlice';
import patientReducer from './patientDataSlicers/patientSlice';
import practitionersReducer from './patientDataSlicers/practitionerSlice';
import practitionerRolesReducer from './patientDataSlicers/practitionerRoleSlice';
import proceduresReducer from './patientDataSlicers/procedureSlice';
import provenancesReducer from './patientDataSlicers/provenanceSlice';
import questionsReducer from './questionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    conditions: conditionsReducer,
    observations: observationsReducer,
    documents: documentsReducer,
    analysis: analysisReducer,
    allergies: allergiesReducer,
    carePlans: carePlansReducer,
    careTeams: careTeamsReducer,
    devices: devicesReducer,
    diagnosticReports: diagnosticReportsReducer,
    encounters: encountersReducer,
    goals: goalsReducer,
    immunizations: immunizationsReducer,
    locations: locationsReducer,
    medicationStatements: medicationStatementsReducer,
    organizations: organizationsReducer,
    patient: patientReducer,
    practitioners: practitionersReducer,
    practitionerRoles: practitionerRolesReducer,
    procedures: proceduresReducer,
    provenances: provenancesReducer,
    questions: questionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;