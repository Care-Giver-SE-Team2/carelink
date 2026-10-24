package sg.nus.carelink.profile.application;

/**
 * Published after a family member submits a service application, so the managers can be told
 * there is a request to plan or decline. Listened for after the submission commits.
 */
public record ServiceApplicationSubmitted(Long applicationId, Long elderId, int careNeedCount) {
}
