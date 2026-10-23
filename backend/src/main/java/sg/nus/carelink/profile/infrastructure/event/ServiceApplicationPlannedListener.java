package sg.nus.carelink.profile.infrastructure.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import sg.nus.carelink.careplan.application.CarePlanPublished;
import sg.nus.carelink.profile.application.ServiceApplicationPlannedRecorder;
import sg.nus.carelink.profile.application.ServiceApplicationSubmitted;

/**
 * Records which service applications are now planned once a care plan version is published, or an
 * application is submitted for care the plan already gives. Runs after the change commits; a
 * failure is logged and costs only speed, since an unrecorded application is still checked from
 * the plans.
 */
@Component
class ServiceApplicationPlannedListener {

	private static final Logger log = LoggerFactory.getLogger(ServiceApplicationPlannedListener.class);

	private final ServiceApplicationPlannedRecorder recorder;

	ServiceApplicationPlannedListener(ServiceApplicationPlannedRecorder recorder) {
		this.recorder = recorder;
	}

	@TransactionalEventListener
	void onCarePlanPublished(CarePlanPublished event) {
		record(event.elderId());
	}

	@TransactionalEventListener
	void onServiceApplicationSubmitted(ServiceApplicationSubmitted event) {
		record(event.elderId());
	}

	private void record(Long elderId) {
		try {
			recorder.recordFor(elderId);
		} catch (RuntimeException failure) {
			log.error("Could not record which service applications for elder {} are planned", elderId, failure);
		}
	}
}
