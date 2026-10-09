package sg.nus.carelink.profile.application;

/**
 * The login created for the elder when the family's application was approved, while the elder
 * still has the temporary password: the applicant passes it on, and it is gone from the
 * application once the elder chooses their own.
 */
public record PendingElderLogin(String username, String temporaryPassword) {
}
