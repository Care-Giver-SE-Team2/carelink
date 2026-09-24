package sg.nus.carelink.profile.application;

import java.time.LocalDate;
import java.util.List;

/** Minimal cross-module projections for an authenticated caregiver's assigned work. */
public interface CaregiverDirectory {
    Profile require(String username);
    ElderView elder(Long elderId);
    List<CredentialAlert> alerts(Long caregiverId, LocalDate today);

    record Profile(Long id, Long userId, String fullName, String phone, String sector, String dialects, String status) {}
    record ElderView(Long elderId, String preferredName, String serviceAddress, String postalSector,
                     List<String> languageNeeds, String accessNotes, String emergencyNotes) {}
    record CredentialAlert(Long id, String name, String certificateNo, LocalDate expiryDate, String status, String warning) {}
}
