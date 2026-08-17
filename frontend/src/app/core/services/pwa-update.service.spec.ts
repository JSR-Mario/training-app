import { TestBed } from '@angular/core/testing';
import { PwaUpdateService } from './pwa-update.service';
import { SwUpdate, VersionEvent, UnrecoverableStateEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

describe('PwaUpdateService', () => {
  let versionUpdates$: Subject<VersionEvent>;
  let unrecoverable$: Subject<UnrecoverableStateEvent>;
  let swUpdateMock: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<UnrecoverableStateEvent>;
    activateUpdate: jasmine.Spy;
    checkForUpdate: jasmine.Spy;
  };

  beforeEach(() => {
    versionUpdates$ = new Subject<VersionEvent>();
    unrecoverable$ = new Subject<UnrecoverableStateEvent>();

    swUpdateMock = {
      isEnabled: true,
      versionUpdates: versionUpdates$,
      unrecoverable: unrecoverable$,
      activateUpdate: jasmine.createSpy('activateUpdate').and.returnValue(Promise.resolve(true)),
      checkForUpdate: jasmine.createSpy('checkForUpdate').and.returnValue(Promise.resolve(true))
    };

    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        { provide: SwUpdate, useValue: swUpdateMock }
      ]
    });
  });

  it('should be created and check for update when enabled', () => {
    const service = TestBed.inject(PwaUpdateService);
    spyOn(service, 'reloadPage').and.stub();
    expect(service).toBeTruthy();
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
  });

  it('should not subscribe or check updates when SwUpdate is disabled', () => {
    swUpdateMock.isEnabled = false;
    swUpdateMock.checkForUpdate.calls.reset();

    const disabledService = TestBed.inject(PwaUpdateService);
    spyOn(disabledService, 'reloadPage').and.stub();
    expect(disabledService).toBeTruthy();
    expect(swUpdateMock.checkForUpdate).not.toHaveBeenCalled();
  });

  it('should call activateUpdate and reloadPage when VERSION_READY event occurs', async () => {
    const service = TestBed.inject(PwaUpdateService);
    const reloadSpy = spyOn(service, 'reloadPage').and.stub();

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'v1' },
      latestVersion: { hash: 'v2' }
    });

    await Promise.resolve();
    expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should call reloadPage when unrecoverable event occurs', () => {
    const service = TestBed.inject(PwaUpdateService);
    const reloadSpy = spyOn(service, 'reloadPage').and.stub();

    unrecoverable$.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'Failed chunk loading'
    });

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should trigger checkForUpdate on manual call', () => {
    const service = TestBed.inject(PwaUpdateService);
    spyOn(service, 'reloadPage').and.stub();
    swUpdateMock.checkForUpdate.calls.reset();

    service.checkForUpdate();
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
  });
});
